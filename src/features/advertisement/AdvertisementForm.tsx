// src/pages/advertisements/AdvertisementForm.tsx
// Ajustes:
// - Remove validFrom/validTo do form
// - Adiciona recurrence (mesmo padrão do checklist) usando RecurrenceForm
// - Ajusta Zod schema
// - Ajusta defaultValues
// - Ajusta onSubmit para enviar recurrence (e remover allowedDays/maxShowsPerDay do header)
// - Ajusta load (useEffect) para mapear recurrence do backend para o formato do form

import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useMemo, useState } from "react";
import { useFieldArray, useForm } from "react-hook-form";
import { Link, useParams } from "react-router-dom";
import { z } from "zod";
import {
  useAddAdvertisementImage,
  useCreateAdvertisement,
  useGetAdvertisementById,
  useRemoveAdvertisementImage,
  useUpdateAdvertisement,
  useUpdateAdvertisementImage,
} from "../../api/services/useAdvertisementService";
import { Button } from "../../components/button/button";
import { Checkbox } from "../../components/input/Checkbox";
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
import { Input } from "../../components/input/Input";
import { AdvertisementImagesSection } from "./AdvertisementImagesSection";
import { AdvertisementVideoFields } from "./AdvertisementVideoFields";

// === Select ===
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../components/input/Select";

// === Combobox ===
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

import type { CustomerApiDTO } from "../../api/dtos/customer";
import { useGetCustomers } from "../../api/services/useCustomerService";
import { useDebounce } from "../../hooks/useDebounce";
import { RecurrenceForm, recurrenceSchema } from "../recurrece/RecurrenceForm";

// ✅ Recorrência (novo)

const advertisementTypeSchema = z.enum(["IMAGE", "VIDEO"], {
  message: "Informe o tipo do anúncio",
});

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

    // ✅ substitui validFrom/validTo/allowedDays/maxShowsPerDay
    recurrence: recurrenceSchema,

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
          message: "Informe ao menos uma imagem para anúncios de Imagem",
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

      // ✅ recorrência igual checklist
      recurrence: undefined,

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
    const recurrencePayload = data.recurrence
      ? {
          startDate: data.recurrence.startDate,
          endDate: data.recurrence.endDate,
          allowedDays: data.recurrence.allowedDays,
          intervalValue:
            data.recurrence.intervalValue &&
            data.recurrence.intervalValue !== ""
              ? Number(data.recurrence.intervalValue)
              : undefined,
          dailyDisplayCount:
            data.recurrence.dailyDisplayCount &&
            data.recurrence.dailyDisplayCount !== ""
              ? Number(data.recurrence.dailyDisplayCount)
              : undefined,
        }
      : undefined;

    const headerPayload = {
      customerId: Number(data.customerId),
      name: data.name,
      type: data.type,
      active: data.active ?? true,
      recurrence: recurrencePayload,
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

      recurrence: advertisementData.recurrence
        ? {
            startDate: advertisementData.recurrence.startDate ?? undefined,
            endDate: advertisementData.recurrence.endDate ?? undefined,
            allowedDays: Array.isArray(advertisementData.recurrence.allowedDays)
              ? advertisementData.recurrence.allowedDays
              : [],
            intervalValue:
              advertisementData.recurrence.intervalValue != null
                ? String(advertisementData.recurrence.intervalValue)
                : undefined,
            dailyDisplayCount:
              advertisementData.recurrence.dailyDisplayCount != null
                ? String(advertisementData.recurrence.dailyDisplayCount)
                : undefined,
          }
        : undefined,

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
    <div className="w-full h-full py-10 px-4 sm:px-6 lg:px-10">
      <div className="mx-auto w-full max-w-6xl">
        <form onSubmit={handleSubmit(onSubmit)}>
          <FieldGroup className="space-y-8">
            <FieldSet>
              <FieldLegend>Advertisement</FieldLegend>
              <FieldDescription>Dados do cabeçalho do anúncio</FieldDescription>

              {/* grid responsivo */}
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {/* CLIENTE (COMBOBOX) */}
                <Field className="xl:col-span-1">
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
                    <div ref={customersAnchor} className="w-full">
                      <ComboboxTrigger
                        render={
                          <Button
                            type="button"
                            variant="outline"
                            className="w-full justify-between font-normal"
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
                        onChange={(e) =>
                          setCustomerSearch(e.currentTarget.value)
                        }
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
                <Field className="md:col-span-1 xl:col-span-2">
                  <FieldLabel>Nome</FieldLabel>
                  <Input {...register("name")} />
                  {errors.name && (
                    <FieldError>{errors.name.message}</FieldError>
                  )}
                </Field>

                {/* TIPO */}
                <Field className="xl:col-span-1">
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
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        <SelectItem value="IMAGE">Imagem</SelectItem>
                        <SelectItem value="VIDEO">Vídeo</SelectItem>
                      </SelectGroup>
                    </SelectContent>
                  </Select>

                  {errors.type && (
                    <FieldError>{errors.type.message}</FieldError>
                  )}
                </Field>

                {/* ATIVO */}
                <Field className="md:col-span-2 xl:col-span-3">
                  <div className="rounded-lg border p-4">
                    <FieldLabel>Ativo</FieldLabel>
                    <div className="mt-2 flex items-center gap-3">
                      <div className="shrink-0">
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
                      </div>
                      <span className="text-sm text-muted-foreground">
                        Marque para ativar o anúncio
                      </span>
                    </div>

                    {errors.active && (
                      <div className="mt-2">
                        <FieldError>{String(errors.active.message)}</FieldError>
                      </div>
                    )}
                  </div>
                </Field>

                {/* SOCIAL */}
                <Field className="md:col-span-2 xl:col-span-3">
                  <div className="rounded-lg border p-4">
                    <FieldLabel>Exibir redes sociais ao final</FieldLabel>
                    <div className="mt-2 flex items-center gap-3">
                      <div className="shrink-0">
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
                      </div>
                      <span className="text-sm text-muted-foreground">
                        Mostra as redes sociais no fim do anúncio
                      </span>
                    </div>

                    {errors.showSocialAtEnd && (
                      <div className="mt-2">
                        <FieldError>
                          {String(errors.showSocialAtEnd.message)}
                        </FieldError>
                      </div>
                    )}
                  </div>
                </Field>

                {/* RECORRÊNCIA */}
                <FieldSet className="md:col-span-2 xl:col-span-3">
                  <div className="rounded-lg border p-4 sm:p-5">
                    {/* header da seção */}
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div className="min-w-0">
                        <FieldLegend>Recorrência</FieldLegend>
                        <FieldDescription>
                          Configure o período e a frequência de exibição do
                          anúncio
                        </FieldDescription>
                      </div>

                      {/* actions */}
                      <div className="shrink-0 sm:pt-1">
                        <RecurrenceForm
                          form={form}
                          basePath=""
                          triggerText="Adicionar Recorrência"
                        />
                      </div>
                    </div>

                    {/* validação */}
                    {(errors as any)?.recurrence && (
                      <div className="mt-3">
                        <FieldError>
                          Verifique os campos de recorrência.
                        </FieldError>
                      </div>
                    )}
                  </div>
                </FieldSet>
              </div>
            </FieldSet>

            {currentType === "VIDEO" && (
              <AdvertisementVideoFields form={form} />
            )}

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
                {isEditMode ? "Salvar Advertisement" : "Salvar"}
              </Button>
            </Field>
          </FieldGroup>
        </form>
      </div>
    </div>
  );
};
