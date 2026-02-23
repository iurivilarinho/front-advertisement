// src/pages/advertisements/AdvertisementForm.tsx

import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect } from "react";
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

/**
 * Observações:
 * - allowedDays no backend é Set<DayOfWeek>. Aqui usamos string no form e convertemos para string[] no submit.
 * - O endpoint é multipart/form-data. O service monta FormData.
 * - Itens (imagens) só aparecem no modo edição, igual ao padrão do Checklist.
 */

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
    active: z.boolean().optional(),
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

  const { fields, append, remove } = useFieldArray({
    control,
    name: "images",
  });

  const currentType = watch("type");

  const { mutateAsync: createAdvertisement } = useCreateAdvertisement();
  const { data: advertisementData } = useGetAdvertisementById(
    id ? Number(id) : undefined,
  );
  const { mutateAsync: updateAdvertisement } = useUpdateAdvertisement();

  // itens (imagens) no modo edição, igual Checklist
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
        // cria já com imagens se type=IMAGE
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
    // Limpa campos específicos quando troca tipo para evitar validação/confusão
    if (currentType === "VIDEO") {
      setValue("images", []);
    } else {
      setValue("videoUrl", "");
      setValue("videoDurationSeconds", "");
      setValue("video", undefined);
    }
  }, [currentType, setValue]);

  return (
    <div className="w-full h-full py-10">
      <form onSubmit={handleSubmit(onSubmit)}>
        <FieldGroup className="space-y-8 bg">
          {/* ====== CABEÇALHO ====== */}
          <FieldSet>
            <FieldLegend>Advertisement</FieldLegend>
            <FieldDescription>Dados do cabeçalho do anúncio</FieldDescription>

            <div className="grid grid-cols-3 gap-6">
              <Field className="col-span-1">
                <FieldLabel>Cliente (ID)</FieldLabel>
                <Input {...register("customerId")} />
                {errors.customerId && (
                  <FieldError>{errors.customerId.message}</FieldError>
                )}
              </Field>

              <Field className="col-span-2">
                <FieldLabel>Nome</FieldLabel>
                <Input {...register("name")} />
                {errors.name && <FieldError>{errors.name.message}</FieldError>}
              </Field>

              <Field className="col-span-1">
                <FieldLabel>Tipo</FieldLabel>
                <Input placeholder="IMAGE ou VIDEO" {...register("type")} />
                {errors.type && <FieldError>{errors.type.message}</FieldError>}
              </Field>

              <Field className="col-span-1">
                <FieldLabel>Ativo</FieldLabel>
                <Input
                  type="checkbox"
                  checked={!!watch("active")}
                  onChange={(e) => setValue("active", e.target.checked)}
                />
                {errors.active && (
                  <FieldError>{String(errors.active.message)}</FieldError>
                )}
              </Field>

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

              <Field className="col-span-1">
                <FieldLabel>Máx. exibições/dia</FieldLabel>
                <Input {...register("maxShowsPerDay")} />
                {errors.maxShowsPerDay && (
                  <FieldError>{errors.maxShowsPerDay.message}</FieldError>
                )}
              </Field>

              <Field className="col-span-2">
                <FieldLabel>Dias permitidos</FieldLabel>
                <Input
                  placeholder="MONDAY,TUESDAY,..."
                  {...register("allowedDays")}
                />
                {errors.allowedDays && (
                  <FieldError>{errors.allowedDays.message}</FieldError>
                )}
              </Field>

              <Field className="col-span-1">
                <FieldLabel>Exibir redes sociais ao final</FieldLabel>
                <Input
                  type="checkbox"
                  checked={!!watch("showSocialAtEnd")}
                  onChange={(e) =>
                    setValue("showSocialAtEnd", e.target.checked)
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

          <FieldSeparator />

          {/* ====== VIDEO (CABEÇALHO) ====== */}
          {currentType === "VIDEO" && (
            <FieldSet>
              <FieldLegend>Vídeo</FieldLegend>
              <FieldDescription>Dados do vídeo do anúncio</FieldDescription>

              <div className="grid grid-cols-3 gap-6">
                <Field className="col-span-2">
                  <FieldLabel>URL do vídeo</FieldLabel>
                  <Input {...register("videoUrl")} />
                  {errors.videoUrl && (
                    <FieldError>{errors.videoUrl.message}</FieldError>
                  )}
                </Field>

                <Field className="col-span-1">
                  <FieldLabel>Duração (segundos)</FieldLabel>
                  <Input {...register("videoDurationSeconds")} />
                  {errors.videoDurationSeconds && (
                    <FieldError>
                      {errors.videoDurationSeconds.message}
                    </FieldError>
                  )}
                </Field>

                <Field className="col-span-3">
                  <FieldLabel>Arquivo de vídeo (opcional)</FieldLabel>
                  <Input
                    type="file"
                    accept="video/*"
                    onChange={(e) => setValue("video", e.target.files?.[0])}
                  />
                  {errors.video && (
                    <FieldError>{String(errors.video.message)}</FieldError>
                  )}
                </Field>
              </div>
            </FieldSet>
          )}

          {/* ====== ITENS (IMAGENS) - SÓ EM EDIÇÃO ====== */}
          {isEditMode && currentType === "IMAGE" && (
            <>
              <FieldSeparator />

              <FieldSet>
                <FieldLegend>Imagens</FieldLegend>
                <FieldDescription>
                  Cadastre as imagens do anúncio
                </FieldDescription>

                <div className="space-y-4">
                  <div className="flex justify-end">
                    <Button
                      type="button"
                      onClick={() =>
                        append({
                          imageUrl: "",
                          displaySeconds: "5",
                          orderIndex: String(fields.length),
                        })
                      }
                    >
                      Adicionar imagem
                    </Button>
                  </div>

                  {(errors.images as any)?.message && (
                    <FieldError>{(errors.images as any)?.message}</FieldError>
                  )}

                  {fields.length === 0 && (
                    <div className="text-sm text-muted-foreground">
                      Nenhuma imagem cadastrada ainda.
                    </div>
                  )}

                  {fields.map((f, index) => (
                    <AdvertisementImageFields
                      key={f.id}
                      form={form}
                      index={index}
                      onRemove={async () => {
                        const imageId = getValues(`images.${index}.id`);
                        if (imageId && id) {
                          await deleteAdvertisementImage({
                            advertisementId: Number(id),
                            imageId,
                          });
                        }
                        remove(index);
                      }}
                    />
                  ))}
                </div>
              </FieldSet>
            </>
          )}

          <FieldSeparator />

          {/* ====== AÇÕES ====== */}
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

type AdvertisementImageFieldsProps = {
  form: ReturnType<typeof useForm<AdvertisementFormSchema>>;
  index: number;
  onRemove: () => Promise<void>;
};

const AdvertisementImageFields = ({
  form,
  index,
  onRemove,
}: AdvertisementImageFieldsProps) => {
  const {
    register,
    setValue,
    formState: { errors },
  } = form;

  const imgErrors = (errors.images?.[index] ?? {}) as any;

  return (
    <FieldSet>
      <FieldLegend>Imagem #{index + 1}</FieldLegend>

      <div className="grid grid-cols-3 gap-6">
        <Field className="col-span-2">
          <FieldLabel>URL da imagem (opcional)</FieldLabel>
          <Input {...register(`images.${index}.imageUrl` as const)} />
          {imgErrors.imageUrl && (
            <FieldError>{imgErrors.imageUrl.message}</FieldError>
          )}
        </Field>

        <Field className="col-span-1">
          <FieldLabel>Tempo (segundos)</FieldLabel>
          <Input {...register(`images.${index}.displaySeconds` as const)} />
          {imgErrors.displaySeconds && (
            <FieldError>{imgErrors.displaySeconds.message}</FieldError>
          )}
        </Field>

        <Field className="col-span-1">
          <FieldLabel>Ordem</FieldLabel>
          <Input {...register(`images.${index}.orderIndex` as const)} />
          {imgErrors.orderIndex && (
            <FieldError>{imgErrors.orderIndex.message}</FieldError>
          )}
        </Field>

        <Field className="col-span-2">
          <FieldLabel>Arquivo (opcional)</FieldLabel>
          <Input
            type="file"
            accept="image/*"
            onChange={(e) =>
              setValue(`images.${index}.image`, e.target.files?.[0])
            }
          />
          {imgErrors.image && (
            <FieldError>{String(imgErrors.image.message)}</FieldError>
          )}
        </Field>

        <Field className="col-span-3 flex justify-end">
          <Button type="button" variant="outline" onClick={() => onRemove()}>
            Remover
          </Button>
        </Field>
      </div>
    </FieldSet>
  );
};
