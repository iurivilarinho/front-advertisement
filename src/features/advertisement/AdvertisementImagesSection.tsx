// src/pages/advertisements/components/AdvertisementImagesSection.tsx

import type { UseFieldArrayReturn, UseFormReturn } from "react-hook-form";

import { AdvertisementImageFields } from "./AdvertisementImageFields";
import type { AdvertisementFormSchema } from "./AdvertisementForm";
import {
  FieldDescription,
  FieldError,
  FieldLegend,
  FieldSeparator,
  FieldSet,
} from "../../components/input/Field";
import { Button } from "../../components/button/button";

type Props = {
  form: UseFormReturn<AdvertisementFormSchema>;
  fieldArray: Pick<
    UseFieldArrayReturn<AdvertisementFormSchema, "images">,
    "fields" | "append" | "remove"
  >;
  advertisementId?: number;
  onDeleteImageById: (imageId: number) => Promise<void>;
};

export const AdvertisementImagesSection = ({
  form,
  fieldArray,
  advertisementId,
  onDeleteImageById,
}: Props) => {
  const {
    getValues,
    formState: { errors },
  } = form;

  const { fields, append, remove } = fieldArray;

  return (
    <>
      <FieldSeparator />

      <FieldSet>
        <FieldLegend>Imagens</FieldLegend>
        <FieldDescription>Cadastre as imagens do anúncio</FieldDescription>

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

                // Só tenta deletar via API se já existe no backend (modo edição)
                if (imageId && advertisementId) {
                  await onDeleteImageById(imageId);
                }

                remove(index);
              }}
            />
          ))}
        </div>
      </FieldSet>
    </>
  );
};
