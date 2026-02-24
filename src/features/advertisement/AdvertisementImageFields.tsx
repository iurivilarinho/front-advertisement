// src/pages/advertisements/components/AdvertisementImageFields.tsx

import type { UseFormReturn } from "react-hook-form";
import { Button } from "../../components/button/button";
import {
  Field,
  FieldError,
  FieldLabel,
  FieldLegend,
  FieldSet,
} from "../../components/input/Field";
import { Input } from "../../components/input/Input";
import type { AdvertisementFormSchema } from "./AdvertisementForm";

type Props = {
  form: UseFormReturn<AdvertisementFormSchema>;
  index: number;
  onRemove: () => Promise<void>;
};

export const AdvertisementImageFields = ({ form, index, onRemove }: Props) => {
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
