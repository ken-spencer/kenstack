"use client";

import { Plus, Trash2 } from "lucide-react";
import { useController, useFormContext } from "react-hook-form";

import Button from "@kenstack/components/Button";
import type { FieldComponentProps } from "@kenstack/fields/formFields";
import { FieldErrorMessage } from "@kenstack/forms/Field";
import { Checkbox } from "@kenstack/forms/controls/Checkbox";
import { Input } from "@kenstack/forms/controls/Input";
import unsecureId from "@kenstack/lib/unsecureId";
import type { RateValue, ratesField } from ".";

type TaxFormValues = Record<string, RateValue[]>;

export default function TaxRatesField({
  name,
  taxCategories,
}: FieldComponentProps & {
  taxCategories: Parameters<typeof ratesField>[0];
}) {
  const {
    control,
    formState: { errors },
  } = useFormContext<TaxFormValues>();
  const { field } = useController<TaxFormValues>({
    control,
    name,
  });
  const rates = field.value ?? [];

  function updateRate(index: number, updates: Partial<RateValue>) {
    field.onChange(
      rates.map((rate, currentIndex) =>
        currentIndex === index ? { ...rate, ...updates } : rate,
      ),
    );
  }

  return (
    <section className="border-border bg-card space-y-3 rounded-lg border p-4 shadow-xs">
      <h2 className="text-foreground text-base font-semibold">Tax rates</h2>

      <div className="divide-border divide-y">
        {rates.length ? (
          rates.map((rate, index) => {
            const rateErrors = errors[name]?.[index];
            const errorIdPrefix = `tax-rate-${rate.id}`;

            return (
              <div
                className="space-y-3 py-4 first:pt-0 last:pb-0"
                key={rate.id}
              >
                <FieldErrorMessage className="text-xs" error={rateErrors?.id} />
                <div className="grid items-start gap-2 sm:grid-cols-[5rem_minmax(0,1fr)_6rem_auto]">
                  <label className="text-foreground grid content-start gap-1 text-sm font-medium">
                    Code
                    <Input
                      value={rate.code}
                      aria-describedby={
                        rateErrors?.code
                          ? `${errorIdPrefix}-code-error`
                          : undefined
                      }
                      aria-invalid={Boolean(rateErrors?.code)}
                      autoComplete="off"
                      className="uppercase"
                      maxLength={16}
                      placeholder="GST"
                      onBlur={field.onBlur}
                      onChange={(event) =>
                        updateRate(index, {
                          code: event.currentTarget.value.toUpperCase(),
                        })
                      }
                    />
                    <FieldErrorMessage
                      className="text-xs"
                      error={rateErrors?.code}
                      id={`${errorIdPrefix}-code-error`}
                    />
                  </label>
                  <label className="text-foreground grid content-start gap-1 text-sm font-medium">
                    Name
                    <Input
                      value={rate.name}
                      aria-describedby={
                        rateErrors?.name
                          ? `${errorIdPrefix}-name-error`
                          : undefined
                      }
                      aria-invalid={Boolean(rateErrors?.name)}
                      autoComplete="off"
                      placeholder="Goods and Services Tax"
                      onBlur={field.onBlur}
                      onChange={(event) =>
                        updateRate(index, { name: event.currentTarget.value })
                      }
                    />
                    <FieldErrorMessage
                      className="text-xs"
                      error={rateErrors?.name}
                      id={`${errorIdPrefix}-name-error`}
                    />
                  </label>
                  <label className="text-foreground grid content-start gap-1 text-sm font-medium">
                    Rate
                    <span className="relative">
                      <Input
                        value={rate.ratePercent}
                        aria-describedby={
                          rateErrors?.ratePercent
                            ? `${errorIdPrefix}-rate-error`
                            : undefined
                        }
                        aria-invalid={Boolean(rateErrors?.ratePercent)}
                        autoComplete="off"
                        inputMode="decimal"
                        placeholder="5"
                        onBlur={field.onBlur}
                        onChange={(event) =>
                          updateRate(index, {
                            ratePercent: event.currentTarget.value,
                          })
                        }
                      />
                      <span className="text-muted-foreground pointer-events-none absolute top-1.5 right-2 text-sm">
                        %
                      </span>
                    </span>
                    <FieldErrorMessage
                      className="text-xs"
                      error={rateErrors?.ratePercent}
                      id={`${errorIdPrefix}-rate-error`}
                    />
                  </label>
                  <div className="flex items-start pt-6">
                    <Button
                      type="button"
                      aria-label={`Remove ${rate.code || "tax rate"}`}
                      icon={Trash2}
                      size="icon"
                      variant="outline"
                      onClick={() =>
                        field.onChange(
                          rates.filter(
                            (_, currentIndex) => currentIndex !== index,
                          ),
                        )
                      }
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="text-foreground text-sm font-medium">
                    Applies to
                  </div>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {Object.keys(taxCategories).map((category) => (
                      <label
                        className="text-foreground flex items-center gap-2 py-1 text-sm"
                        key={category}
                      >
                        <Checkbox
                          checked={rate.categories.includes(category)}
                          onCheckedChange={() =>
                            updateRate(index, {
                              categories: rate.categories.includes(category)
                                ? rate.categories.filter(
                                    (item) => item !== category,
                                  )
                                : [...rate.categories, category],
                            })
                          }
                        />
                        {taxCategories[category]}
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            );
          })
        ) : (
          <div className="text-muted-foreground py-4 text-sm">
            No tax rates have been added for this region.
          </div>
        )}
      </div>

      <div className="pt-1">
        <Button
          type="button"
          size="sm"
          icon={Plus}
          onClick={() =>
            field.onChange([
              ...rates,
              {
                categories: [],
                code: "",
                id: unsecureId(),
                name: "",
                ratePercent: "",
              },
            ])
          }
        >
          Add tax
        </Button>
      </div>
    </section>
  );
}
