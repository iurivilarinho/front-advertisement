import type {
  FieldValues,
  Path,
  PathValue,
  UseFormReturn,
} from "react-hook-form";
import z from "zod";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "../../components/dialog/Dialog";
import { Button } from "../../components/button/button";
import { Field, FieldLabel } from "../../components/input/Field";
import { Input } from "../../components/input/Input";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../components/input/Select";
export type UnitTypeApiEnum = "DAY" | "WEEK" | "MONTH" | "YEAR";

export const recurrenceSchema = z
  .object({
    startDate: z.string().optional(),
    endDate: z.string().optional(),
    unit: z.custom<UnitTypeApiEnum>().optional(),
    intervalValue: z.string().optional(),
  })
  .optional();

type RecurrenceFormProps<TFormValues extends FieldValues> = {
  form: UseFormReturn<TFormValues>;
  basePath?: Path<TFormValues> | "";
  title?: string;
  triggerText?: string;
  contentClassName?: string;
};

export function RecurrenceForm<TFormValues extends FieldValues>({
  form,
  basePath = "" as Path<TFormValues> | "",
  title = "Recorrência",
  triggerText = "Editar recorrência",
  contentClassName,
}: RecurrenceFormProps<TFormValues>) {
  const { register, watch, setValue } = form;

  const withBase = (suffix: string) =>
    (basePath ? `${String(basePath)}.${suffix}` : suffix) as Path<TFormValues>;

  const startDatePath = withBase("recurrence.startDate");
  const endDatePath = withBase("recurrence.endDate");
  const unitPath = withBase("recurrence.unit");
  const intervalPath = withBase("recurrence.intervalValue");

  const unitValue = watch(unitPath) as
    | PathValue<TFormValues, typeof unitPath>
    | undefined;

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button type="button" variant="default">
          {triggerText}
        </Button>
      </DialogTrigger>

      <DialogContent className={contentClassName}>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-4">
          <Field className="col-span-2">
            <FieldLabel>Recorrência (Início)</FieldLabel>
            <Input type="date" {...register(startDatePath)} />
          </Field>

          <Field className="col-span-2">
            <FieldLabel>Recorrência (Fim)</FieldLabel>
            <Input type="date" {...register(endDatePath)} />
          </Field>

          <Field className="col-span-1">
            <FieldLabel>Unidade</FieldLabel>
            <Select
              value={(unitValue ?? "") as string}
              onValueChange={(v) =>
                setValue(
                  unitPath,
                  v as PathValue<TFormValues, typeof unitPath>,
                  {
                    shouldDirty: true,
                    shouldTouch: true,
                    shouldValidate: true,
                  },
                )
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione" />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectItem value="DAILY">Diária</SelectItem>
                  <SelectItem value="WEEKLY">Semanal</SelectItem>
                  <SelectItem value="MONTHLY">Mensal</SelectItem>
                  <SelectItem value="YEARLY">Anual</SelectItem>
                </SelectGroup>
              </SelectContent>
            </Select>
          </Field>

          <Field className="col-span-1">
            <FieldLabel>Intervalo</FieldLabel>
            <Input
              {...register(intervalPath)}
              inputMode="numeric"
              placeholder="1"
            />
          </Field>
        </div>
      </DialogContent>
    </Dialog>
  );
}
