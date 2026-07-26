"use client";

import { useMemo, useState } from "react";

type Hour = {
  dayOfWeek?: number;
  date?: string;
  opensAt?: string | null;
  closesAt?: string | null;
  isClosed?: boolean;
  note?: string | null;
};
type Fact = {
  key: string;
  label: string;
  type: "text" | "number" | "boolean";
  value: string;
};
const days = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];
const categoryFields: Record<string, Omit<Fact, "value">[]> = {
  resort: [
    { key: "day_use", label: "Day use available", type: "boolean" },
    { key: "overnight", label: "Overnight available", type: "boolean" },
    { key: "room_count", label: "Room count", type: "number" },
    { key: "beach_access", label: "Beach access", type: "boolean" },
  ],
  room: [
    { key: "room_type", label: "Room type", type: "text" },
    { key: "air_conditioned", label: "Air conditioned", type: "boolean" },
    { key: "bed_count", label: "Bed count", type: "number" },
  ],
  restaurant: [
    { key: "cuisine", label: "Cuisine", type: "text" },
    { key: "halal", label: "Halal suitable", type: "boolean" },
    { key: "reservations", label: "Reservations accepted", type: "boolean" },
  ],
  activity: [
    { key: "duration_hours", label: "Duration (hours)", type: "number" },
    { key: "includes", label: "Included items", type: "text" },
    { key: "max_pax", label: "Maximum guests", type: "number" },
  ],
  service: [
    { key: "service_type", label: "Service type", type: "text" },
    { key: "duration_hours", label: "Duration (hours)", type: "number" },
    { key: "max_pax", label: "Maximum guests", type: "number" },
  ],
};

export function StructuredListingDetails({
  category,
  attributes,
  weekly,
  special,
}: {
  category: string;
  attributes: Record<string, unknown>;
  weekly: Hour[];
  special: Hour[];
}) {
  const [facts, setFacts] = useState<Fact[]>(() =>
    (categoryFields[category] ?? []).map((field) => ({
      ...field,
      value:
        attributes[field.key] === undefined
          ? ""
          : String(attributes[field.key]),
    })),
  );
  const [hours, setHours] = useState<Hour[]>(
    days.map(
      (_, dayOfWeek) =>
        weekly.find((item) => item.dayOfWeek === dayOfWeek) ?? {
          dayOfWeek,
          opensAt: "08:00",
          closesAt: "17:00",
          isClosed: true,
        },
    ),
  );
  const [specialHours, setSpecialHours] = useState<Hour[]>(special);
  const attributeJson = useMemo(
    () =>
      Object.fromEntries(
        facts
          .filter((fact) => fact.value.trim())
          .map((fact) => [
            fact.key,
            fact.type === "number"
              ? Number(fact.value)
              : fact.type === "boolean"
                ? fact.value === "true"
                : fact.value.trim(),
          ]),
      ),
    [facts],
  );

  return (
    <section className="space-y-5">
      <div>
        <h2 className="text-lg font-semibold">Category details</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          These are the supported comparison facts for this {category}. Only
          completed structured facts can be used by future search filters.
        </p>
      </div>
      <input
        name="categoryAttributes"
        type="hidden"
        value={JSON.stringify(attributeJson)}
      />
      <div className="grid gap-2">
        {facts.map((fact, index) => (
          <label
            className="grid gap-1 sm:grid-cols-[minmax(12rem,0.7fr)_1fr] sm:items-center"
            key={fact.key}
          >
            <span className="text-sm font-medium">{fact.label}</span>
            {fact.type === "boolean" ? (
              <select
                aria-label={fact.label}
                className="min-h-11 rounded-md border bg-background px-3 text-sm"
                onChange={(event) =>
                  setFacts((current) =>
                    current.map((item, itemIndex) =>
                      itemIndex === index
                        ? { ...item, value: event.target.value }
                        : item,
                    ),
                  )
                }
                value={fact.value}
              >
                <option value="">Not provided</option>
                <option value="true">Yes</option>
                <option value="false">No</option>
              </select>
            ) : (
              <input
                aria-label={fact.label}
                className="min-h-11 rounded-md border bg-background px-3 text-sm"
                onChange={(event) =>
                  setFacts((current) =>
                    current.map((item, itemIndex) =>
                      itemIndex === index
                        ? { ...item, value: event.target.value }
                        : item,
                    ),
                  )
                }
                placeholder={fact.type === "number" ? "0" : "Not provided"}
                type={fact.type === "number" ? "number" : "text"}
                value={fact.value}
              />
            )}
          </label>
        ))}
      </div>
      <div>
        <h2 className="text-lg font-semibold">Weekly hours</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Closed is explicit. Leave no day implied as open.
        </p>
      </div>
      <input name="weeklyHours" type="hidden" value={JSON.stringify(hours)} />
      <div className="grid gap-2">
        {hours.map((hour, index) => (
          <div
            className="grid items-center gap-2 rounded-md border p-3 sm:grid-cols-[120px_auto_1fr_1fr]"
            key={hour.dayOfWeek}
          >
            <span className="text-sm font-medium">{days[index]}</span>
            <label className="flex min-h-11 items-center gap-2 text-sm">
              <input
                checked={!hour.isClosed}
                onChange={(event) =>
                  setHours((current) =>
                    current.map((item, itemIndex) =>
                      itemIndex === index
                        ? { ...item, isClosed: !event.target.checked }
                        : item,
                    ),
                  )
                }
                type="checkbox"
              />{" "}
              Open
            </label>
            <input
              aria-label={`${days[index]} opens`}
              className="min-h-11 rounded-md border px-3"
              disabled={hour.isClosed}
              onChange={(event) =>
                setHours((current) =>
                  current.map((item, itemIndex) =>
                    itemIndex === index
                      ? { ...item, opensAt: event.target.value }
                      : item,
                  ),
                )
              }
              type="time"
              value={hour.opensAt ?? ""}
            />
            <input
              aria-label={`${days[index]} closes`}
              className="min-h-11 rounded-md border px-3"
              disabled={hour.isClosed}
              onChange={(event) =>
                setHours((current) =>
                  current.map((item, itemIndex) =>
                    itemIndex === index
                      ? { ...item, closesAt: event.target.value }
                      : item,
                  ),
                )
              }
              type="time"
              value={hour.closesAt ?? ""}
            />
          </div>
        ))}
      </div>
      <div>
        <h2 className="text-lg font-semibold">Special hours</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Add holidays or exceptional opening times.
        </p>
      </div>
      <input
        name="specialHours"
        type="hidden"
        value={JSON.stringify(specialHours)}
      />
      <div className="grid gap-2">
        {specialHours.map((hour, index) => (
          <div
            className="grid gap-2 rounded-md border p-3 sm:grid-cols-[1fr_auto_1fr_1fr_1fr_auto]"
            key={`${hour.date}-${index}`}
          >
            <input
              aria-label="Special-hours date"
              className="min-h-11 rounded-md border px-3"
              onChange={(event) =>
                setSpecialHours((current) =>
                  current.map((item, itemIndex) =>
                    itemIndex === index
                      ? { ...item, date: event.target.value }
                      : item,
                  ),
                )
              }
              type="date"
              value={hour.date ?? ""}
            />
            <label className="flex min-h-11 items-center gap-2 text-sm">
              <input
                checked={!hour.isClosed}
                onChange={(event) =>
                  setSpecialHours((current) =>
                    current.map((item, itemIndex) =>
                      itemIndex === index
                        ? { ...item, isClosed: !event.target.checked }
                        : item,
                    ),
                  )
                }
                type="checkbox"
              />{" "}
              Open
            </label>
            <input
              aria-label="Special opens"
              className="min-h-11 rounded-md border px-3"
              disabled={hour.isClosed}
              onChange={(event) =>
                setSpecialHours((current) =>
                  current.map((item, itemIndex) =>
                    itemIndex === index
                      ? { ...item, opensAt: event.target.value }
                      : item,
                  ),
                )
              }
              type="time"
              value={hour.opensAt ?? ""}
            />
            <input
              aria-label="Special closes"
              className="min-h-11 rounded-md border px-3"
              disabled={hour.isClosed}
              onChange={(event) =>
                setSpecialHours((current) =>
                  current.map((item, itemIndex) =>
                    itemIndex === index
                      ? { ...item, closesAt: event.target.value }
                      : item,
                  ),
                )
              }
              type="time"
              value={hour.closesAt ?? ""}
            />
            <input
              aria-label="Special-hours note"
              className="min-h-11 rounded-md border px-3"
              onChange={(event) =>
                setSpecialHours((current) =>
                  current.map((item, itemIndex) =>
                    itemIndex === index
                      ? { ...item, note: event.target.value }
                      : item,
                  ),
                )
              }
              placeholder="Optional note"
              value={hour.note ?? ""}
            />
            <button
              className="min-h-11 rounded-md border px-3 text-sm"
              onClick={() =>
                setSpecialHours((current) =>
                  current.filter((_, itemIndex) => itemIndex !== index),
                )
              }
              type="button"
            >
              Remove
            </button>
          </div>
        ))}
      </div>
      <button
        className="min-h-11 rounded-md border px-3 text-sm font-medium"
        onClick={() =>
          setSpecialHours((current) => [
            ...current,
            {
              date: "",
              opensAt: "08:00",
              closesAt: "17:00",
              isClosed: true,
              note: "",
            },
          ])
        }
        type="button"
      >
        Add special hours
      </button>
    </section>
  );
}
