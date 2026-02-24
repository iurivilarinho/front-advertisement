// src/pages/advertisements/AdvertisementForm.tsx
// Alterações:
// - customerId: Combobox (lista de clientes)
// - type: Select (Imagem/Vídeo)
// - allowedDays: Select múltiplo (dias da semana) -> mantém string CSV no form

import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useMemo, useState } from "react";
import { useFieldArray, useForm } from "react-hook-form";
import { Link, useParams } from "react-router-dom";
import { z } from "zod";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSeparator,
  FieldSet,
} from "../../components/input/Field";
import { Button } from "../../components/button/button";
import {
  useAddAdvertisementImage,
  useCreateAdvertisement,
  useGetAdvertisementById,
  useRemoveAdvertisementImage,
  useUpdateAdvertisement,
  useUpdateAdvertisementImage,
} from "../../api/services/useAdvertisementService";
import { Input } from "../../components/input/Input";
import { Checkbox } from "../../components/input/Checkbox";
import { AdvertisementVideoFields } from "./AdvertisementVideoFields";
import { AdvertisementImagesSection } from "./AdvertisementImagesSection";

// === Select ===
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../components/input/Select";

// === Combobox (mesmo padrão do seu exemplo) ===
import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
  ComboboxTrigger,
  ComboboxValue,
  useComboboxAnchor,
} from "../../components/input/Combobox";

// ⚠️ Ajuste para o seu service real
import { useGetCustomers } from "../../api/services/useCustomerService";
import type { CustomerApiDTO } from "../../api/dtos/customer";
import { useDebounce } from "../../hooks/useDebounce";

const advertisementTypeSchema = z.enum(["IMAGE", "VIDEO"], {
  message: "Informe o tipo do anúncio",
});

const dayListSchema = z
  .string()
  .min(1, "Informe os dias permitidos")
  .refine(
    (value) => {
      const parts = value
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);

      if (parts.length === 0) return false;

      const allowed = new Set([
        "MONDAY",
        "TUESDAY",
        "WEDNESDAY",
        "THURSDAY",
        "FRIDAY",
        "SATURDAY",
        "SUNDAY",
      ]);

      return parts.every((p) => allowed.has(p));
    },
    {
      message:
        "Informe os dias em inglês, separados por vírgula. Ex.: MONDAY,TUESDAY,WEDNESDAY",
    },
  );

export const advertisementImageSchema = z.object({
  id: z.number().optional(),
  imageUrl: z.string().max(1000, "Máximo de 1000 caracteres").optional(),
  displaySeconds: z
    .string()
    .min(1, "Informe o tempo de exibição")
    .refine((v) => Number(v) >= 1, "Deve ser maior ou igual a 1"),
  orderIndex: z
    .string()
    .min(1, "Informe a ordem")
    .refine((v) => Number(v) >= 0, "Deve ser maior ou igual a 0"),
  image: z
    .any()
    .optional()
    .refine(
      (f) => f == null || f instanceof File,
      "Arquivo de imagem inválido",
    ),
});

export type AdvertisementImageFormSchema = z.infer<
  typeof advertisementImageSchema
>;

export const advertisementFormSchema = z
  .object({
    customerId: z
      .string()
      .min(1, "Informe o cliente")
      .refine((v) => Number(v) > 0, "Informe um cliente válido"),
    name: z
      .string()
      .min(1, "Informe o nome do anúncio")
      .max(200, "Máximo de 200 caracteres"),
    type: advertisementTypeSchema,
    active: z.boolean(),
    validFrom: z.string().min(1, "Informe a data de início (YYYY-MM-DD)"),
    validTo: z.string().min(1, "Informe a data de fim (YYYY-MM-DD)"),
    maxShowsPerDay: z
      .string()
      .min(1, "Informe o máximo de exibições por dia")
      .refine((v) => Number(v) >= 0, "Deve ser maior ou igual a 0"),
    allowedDays: dayListSchema,
    showSocialAtEnd: z.boolean().optional(),

    // VIDEO
    videoUrl: z.string().max(1000, "Máximo de 1000 caracteres").optional(),
    videoDurationSeconds: z
      .string()
      .optional()
      .refine(
        (v) => v == null || v === "" || Number(v) >= 0,
        "Deve ser maior ou igual a 0",
      ),
    video: z
      .any()
      .optional()
      .refine(
        (f) => f == null || f instanceof File,
        "Arquivo de vídeo inválido",
      ),

    // IMAGE
    images: z.array(advertisementImageSchema).optional(),
  })
  .superRefine((data, ctx) => {
    if (data.type === "IMAGE") {
      const images = data.images ?? [];
      if (images.length === 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["images"],
          message: "Informe ao menos uma imagem para anúncios do tipo IMAGE",
        });
      }
    }

    if (data.type === "VIDEO") {
      const hasVideoUrl = !!data.videoUrl && data.videoUrl.trim().length > 0;
      const hasVideoFile = data.video instanceof File;
      if (!hasVideoUrl && !hasVideoFile) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["videoUrl"],
          message: "Informe a URL do vídeo ou envie um arquivo de vídeo",
        });
      }
    }
  });

export type AdvertisementFormSchema = z.infer<typeof advertisementFormSchema>;

type RouteParams = {
  formType?: "criar" | "editar";
  id?: string;
};

const DAY_OPTIONS: Array<{ value: string; label: string }> = [
  { value: "MONDAY", label: "Segunda" },
  { value: "TUESDAY", label: "Terça" },
  { value: "WEDNESDAY", label: "Quarta" },
  { value: "THURSDAY", label: "Quinta" },
  { value: "FRIDAY", label: "Sexta" },
  { value: "SATURDAY", label: "Sábado" },
  { value: "SUNDAY", label: "Domingo" },
];

export const AdvertisementForm = () => {
  const { formType, id } = useParams<RouteParams>();
  const isEditMode = formType === "editar" && !!id;

  const form = useForm<AdvertisementFormSchema>({
    resolver: zodResolver(advertisementFormSchema),
    defaultValues: {
      customerId: "",
      name: "",
      type: "IMAGE",
      active: true,
      validFrom: "",
      validTo: "",
      maxShowsPerDay: "0",
      allowedDays: "MONDAY,TUESDAY,WEDNESDAY,THURSDAY,FRIDAY,SATURDAY,SUNDAY",
      showSocialAtEnd: false,
      videoUrl: "",
      videoDurationSeconds: "",
      video: undefined,
      images: [],
    },
  });

  const {
    register,
    reset,
    getValues,
    handleSubmit,
    control,
    formState: { errors },
    watch,
    setValue,
  } = form;

  const imagesFieldArray = useFieldArray({
    control,
    name: "images",
  });

  const currentType = watch("type");

  // === CUSTOMER combobox state ===
  const customersAnchor = useComboboxAnchor();
  const [customerSearch, setCustomerSearch] = useState("");
  const debouncedCustomerSearch = useDebounce(customerSearch);

  // ⚠️ Ajuste para seu endpoint real
  const customersQuery = useGetCustomers({
    page: 0,
    size: 20,
    search: debouncedCustomerSearch?.trim()
      ? debouncedCustomerSearch.trim()
      : undefined,

    sort: [{ by: "name", direction: "asc" }],
  });

  const customers = customersQuery.data?.content ?? [];

  const selectedCustomerId = watch("customerId");
  const selectedCustomer = useMemo(() => {
    const idNum = Number(selectedCustomerId);
    if (!idNum) return undefined;
    return customers.find((c: CustomerApiDTO) => c.id === idNum);
  }, [customers, selectedCustomerId]);

  // === allowedDays helpers (mantém string CSV no form) ===
  const allowedDaysCsv = watch("allowedDays") ?? "";
  const allowedDaysSet = useMemo(() => {
    return new Set(
      allowedDaysCsv
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean),
    );
  }, [allowedDaysCsv]);

  const toggleDay = (day: string) => {
    const next = new Set(allowedDaysSet);
    if (next.has(day)) next.delete(day);
    else next.add(day);

    const csv = Array.from(next).join(",");
    setValue("allowedDays", csv, {
      shouldDirty: true,
      shouldTouch: true,
      shouldValidate: true,
    });
  };

  const { mutateAsync: createAdvertisement } = useCreateAdvertisement();
  const { data: advertisementData } = useGetAdvertisementById(
    id ? Number(id) : undefined,
  );
  const { mutateAsync: updateAdvertisement } = useUpdateAdvertisement();

  const { mutateAsync: updateAdvertisementImage } =
    useUpdateAdvertisementImage();
  const { mutateAsync: createAdvertisementImage } = useAddAdvertisementImage();
  const { mutateAsync: deleteAdvertisementImage } =
    useRemoveAdvertisementImage();

  const onSubmit = async (data: AdvertisementFormSchema) => {
    const allowedDaysArray = data.allowedDays
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);

    const headerPayload = {
      customerId: Number(data.customerId),
      name: data.name,
      type: data.type,
      active: data.active ?? true,
      validFrom: data.validFrom,
      validTo: data.validTo,
      maxShowsPerDay: Number(data.maxShowsPerDay),
      allowedDays: allowedDaysArray,
      showSocialAtEnd: data.showSocialAtEnd ?? false,

      videoUrl: data.videoUrl ? data.videoUrl : undefined,
      videoDurationSeconds:
        data.videoDurationSeconds && data.videoDurationSeconds !== ""
          ? Number(data.videoDurationSeconds)
          : undefined,
      video: data.video instanceof File ? data.video : undefined,
    };

    if (!isEditMode) {
      await createAdvertisement({
        ...headerPayload,
        images:
          data.type === "IMAGE"
            ? (data.images ?? []).map((img) => ({
                imageUrl: img.imageUrl,
                displaySeconds: Number(img.displaySeconds),
                orderIndex: Number(img.orderIndex),
                image: img.image instanceof File ? img.image : undefined,
              }))
            : [],
      });
      return;
    }

    await updateAdvertisement({
      id: Number(id),
      ...headerPayload,
    });

    if (data.type !== "IMAGE") return;

    const imagesPayload =
      data.images?.map((img) => ({
        id: img.id,
        imageUrl: img.imageUrl,
        displaySeconds: Number(img.displaySeconds),
        orderIndex: Number(img.orderIndex),
        image: img.image instanceof File ? img.image : undefined,
      })) ?? [];

    for (const img of imagesPayload) {
      if (img.id) {
        await updateAdvertisementImage({
          advertisementId: Number(id),
          imageId: img.id,
          ...img,
        });
        continue;
      }

      await createAdvertisementImage({
        advertisementId: Number(id),
        ...img,
      });
    }
  };

  useEffect(() => {
    if (!advertisementData) return;

    const formattedData: AdvertisementFormSchema = {
      customerId: String(advertisementData.customerId ?? ""),
      name: advertisementData.name ?? "",
      type: (advertisementData.type as "IMAGE" | "VIDEO") ?? "IMAGE",
      active: advertisementData.active ?? true,
      validFrom: advertisementData.validFrom ?? "",
      validTo: advertisementData.validTo ?? "",
      maxShowsPerDay:
        advertisementData.maxShowsPerDay != null
          ? String(advertisementData.maxShowsPerDay)
          : "0",
      allowedDays: Array.isArray(advertisementData.allowedDays)
        ? advertisementData.allowedDays.join(",")
        : "MONDAY,TUESDAY,WEDNESDAY,THURSDAY,FRIDAY,SATURDAY,SUNDAY",
      showSocialAtEnd: advertisementData.showSocialAtEnd ?? false,

      videoUrl: advertisementData.videoUrl ?? "",
      videoDurationSeconds:
        advertisementData.videoDurationSeconds != null
          ? String(advertisementData.videoDurationSeconds)
          : "",
      video: undefined,

      images: (advertisementData.images ?? []).map((img: any) => ({
        id: img.id,
        imageUrl: img.imageUrl ?? "",
        displaySeconds:
          img.displaySeconds != null ? String(img.displaySeconds) : "5",
        orderIndex: img.orderIndex != null ? String(img.orderIndex) : "0",
        image: undefined,
      })),
    };

    reset(formattedData);
  }, [advertisementData, reset]);

  useEffect(() => {
    if (currentType === "VIDEO") {
      setValue("images", []);
    } else {
      setValue("videoUrl", "");
      setValue("videoDurationSeconds", "");
      setValue("video", undefined);
    }
  }, [currentType, setValue]);

  return (
    <div className="w-full h-full py-10 px-20">
      <form onSubmit={handleSubmit(onSubmit)}>
        <FieldGroup className="space-y-8 bg">
          <FieldSet>
            <FieldLegend>Advertisement</FieldLegend>
            <FieldDescription>Dados do cabeçalho do anúncio</FieldDescription>

            <div className="grid grid-cols-3 gap-6">
              {/* CLIENTE (COMBOBOX) */}
              <Field className="col-span-1">
                <FieldLabel>Cliente</FieldLabel>

                <Combobox
                  items={customers}
                  onValueChange={(customer: CustomerApiDTO | null) =>
                    setValue(
                      "customerId",
                      customer ? String(customer.id) : "",
                      {
                        shouldDirty: true,
                        shouldTouch: true,
                        shouldValidate: true,
                      },
                    )
                  }
                  itemToStringLabel={(c: CustomerApiDTO) => c.name}
                >
                  <div ref={customersAnchor}>
                    <ComboboxTrigger
                      render={
                        <Button
                          type="button"
                          variant="outline"
                          className="justify-between font-normal w-full"
                        >
                          <ComboboxValue>
                            {selectedCustomer?.name ?? "Selecione um cliente"}
                          </ComboboxValue>
                        </Button>
                      }
                    />
                  </div>

                  <ComboboxContent anchor={customersAnchor}>
                    <ComboboxInput
                      placeholder="Buscar cliente..."
                      value={customerSearch}
                      onChange={(e) => setCustomerSearch(e.currentTarget.value)}
                      showTrigger={false}
                    />

                    <ComboboxEmpty>
                      {customersQuery.isFetching
                        ? "Buscando..."
                        : "Nenhum cliente encontrado"}
                    </ComboboxEmpty>

                    <ComboboxList>
                      {(c: CustomerApiDTO) => (
                        <ComboboxItem key={c.id} value={c}>
                          {c.name}
                        </ComboboxItem>
                      )}
                    </ComboboxList>
                  </ComboboxContent>
                </Combobox>

                {errors.customerId && (
                  <FieldError>{errors.customerId.message}</FieldError>
                )}
              </Field>

              {/* NOME */}
              <Field className="col-span-2">
                <FieldLabel>Nome</FieldLabel>
                <Input {...register("name")} />
                {errors.name && <FieldError>{errors.name.message}</FieldError>}
              </Field>

              {/* TIPO (SELECT) */}
              <Field className="col-span-1">
                <FieldLabel>Tipo</FieldLabel>
                <Select
                  value={currentType}
                  onValueChange={(v) =>
                    setValue("type", v as "IMAGE" | "VIDEO", {
                      shouldDirty: true,
                      shouldTouch: true,
                      shouldValidate: true,
                    })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      <SelectItem value="IMAGE">Imagem</SelectItem>
                      <SelectItem value="VIDEO">Vídeo</SelectItem>
                    </SelectGroup>
                  </SelectContent>
                </Select>

                {errors.type && <FieldError>{errors.type.message}</FieldError>}
              </Field>

              {/* ATIVO */}
              <Field className="col-span-1">
                <FieldLabel>Ativo</FieldLabel>
                <Checkbox
                  checked={watch("active")}
                  onCheckedChange={(value) =>
                    setValue("active", value === true, {
                      shouldDirty: true,
                      shouldTouch: true,
                      shouldValidate: true,
                    })
                  }
                />
                {errors.active && (
                  <FieldError>{String(errors.active.message)}</FieldError>
                )}
              </Field>

              {/* DATAS */}
              <Field className="col-span-1">
                <FieldLabel>Início (YYYY-MM-DD)</FieldLabel>
                <Input {...register("validFrom")} />
                {errors.validFrom && (
                  <FieldError>{errors.validFrom.message}</FieldError>
                )}
              </Field>

              <Field className="col-span-1">
                <FieldLabel>Fim (YYYY-MM-DD)</FieldLabel>
                <Input {...register("validTo")} />
                {errors.validTo && (
                  <FieldError>{errors.validTo.message}</FieldError>
                )}
              </Field>

              {/* MAX SHOWS */}
              <Field className="col-span-1">
                <FieldLabel>Máx. exibições/dia</FieldLabel>
                <Input {...register("maxShowsPerDay")} />
                {errors.maxShowsPerDay && (
                  <FieldError>{errors.maxShowsPerDay.message}</FieldError>
                )}
              </Field>

              {/* DIAS PERMITIDOS (MULTISELECT) */}
              <Field className="col-span-2">
                <FieldLabel>Dias permitidos</FieldLabel>

                <div className="flex flex-wrap gap-2 rounded-md border p-2">
                  {DAY_OPTIONS.map((d) => {
                    const checked = allowedDaysSet.has(d.value);
                    return (
                      <label
                        key={d.value}
                        className="flex items-center gap-2 rounded-md border px-2 py-1 text-sm"
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleDay(d.value)}
                        />
                        <span>{d.label}</span>
                      </label>
                    );
                  })}
                </div>

                {/* Mantém o campo registrado (string CSV) */}
                <input type="hidden" {...register("allowedDays")} />

                {errors.allowedDays && (
                  <FieldError>{errors.allowedDays.message}</FieldError>
                )}
              </Field>

              {/* SOCIAL */}
              <Field className="col-span-1">
                <FieldLabel>Exibir redes sociais ao final</FieldLabel>
                <Checkbox
                  checked={watch("showSocialAtEnd")}
                  onCheckedChange={(value) =>
                    setValue("showSocialAtEnd", value === true, {
                      shouldDirty: true,
                      shouldTouch: true,
                      shouldValidate: true,
                    })
                  }
                />
                {errors.showSocialAtEnd && (
                  <FieldError>
                    {String(errors.showSocialAtEnd.message)}
                  </FieldError>
                )}
              </Field>
            </div>
          </FieldSet>

          {currentType === "VIDEO" && <AdvertisementVideoFields form={form} />}

          {currentType === "IMAGE" && (
            <AdvertisementImagesSection
              form={form}
              fieldArray={imagesFieldArray}
              advertisementId={id ? Number(id) : undefined}
              onDeleteImageById={async (imageId) => {
                if (!id) return;
                await deleteAdvertisementImage({
                  advertisementId: Number(id),
                  imageId,
                });
              }}
            />
          )}

          <FieldSeparator />

          <Field orientation="horizontal" className="justify-end gap-2">
            <Button asChild variant="outline" type="button">
              <Link to="/advertisements">Cancelar</Link>
            </Button>

            <Button type="submit">
              {isEditMode ? "Salvar Advertisement" : "Salvar Cabeçalho"}
            </Button>
          </Field>
        </FieldGroup>
      </form>
    </div>
  );
};
