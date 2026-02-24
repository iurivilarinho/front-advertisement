// src/pages/advertisements/components/AdvertisementVideoFields.tsx

import type { UseFormReturn } from "react-hook-form";
import type { AdvertisementFormSchema } from "./AdvertisementForm";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldLabel,
  FieldLegend,
  FieldSeparator,
  FieldSet,
} from "../../components/input/Field";
import { Input } from "../../components/input/Input";

type Props = {
  form: UseFormReturn<AdvertisementFormSchema>;
};

export const AdvertisementVideoFields = ({ form }: Props) => {
  const {
    register,
    setValue,
    formState: { errors },
  } = form;

  return (
    <>
      <FieldSeparator />
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
              <FieldError>{errors.videoDurationSeconds.message}</FieldError>
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
    </>
  );
};
