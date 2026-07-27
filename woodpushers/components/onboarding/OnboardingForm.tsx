"use client";

import { useActionState } from "react";
import { completeOnboarding, type OnboardingState } from "@/app/onboarding/actions";
import { HomeCityPicker } from "@/components/onboarding/HomeCityPicker";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import {
  AVAILABILITY_CHIPS,
  RATING_BANDS,
  TIME_CONTROLS,
} from "@/lib/profile";

/** Checkbox styled as a chip. Submits natively via FormData.getAll(name). */
function Chip({
  name,
  value,
  label,
}: {
  name: string;
  value: string;
  label: string;
}) {
  return (
    <label className="cursor-pointer">
      <input type="checkbox" name={name} value={value} className="peer sr-only" />
      <span className="inline-block rounded-full border border-border px-3 py-1.5 text-sm peer-checked:border-primary peer-checked:bg-primary peer-checked:text-primary-foreground">
        {label}
      </span>
    </label>
  );
}

export function OnboardingForm() {
  const [state, action, pending] = useActionState<OnboardingState, FormData>(
    completeOnboarding,
    {},
  );

  return (
    <form action={action} className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <Label htmlFor="handle">Username</Label>
        <Input
          id="handle"
          name="handle"
          placeholder="magnus_c"
          autoCapitalize="none"
          autoComplete="off"
          required
        />
        <p className="text-xs text-muted-foreground">
          Your public username: lowercase letters, numbers, underscores.
        </p>
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="display_name">Display name</Label>
        <Input id="display_name" name="display_name" placeholder="Magnus C." required />
      </div>

      <div className="flex flex-col gap-2">
        <Label>Home city</Label>
        <HomeCityPicker />
      </div>

      <div className="flex flex-col gap-2">
        <Label>Preferred time controls</Label>
        <div className="flex flex-wrap gap-2">
          {TIME_CONTROLS.map((t) => (
            <Chip key={t.value} name="time_controls" value={t.value} label={t.label} />
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <Label>When you usually play</Label>
        <div className="flex flex-wrap gap-2">
          {AVAILABILITY_CHIPS.map((c) => (
            <Chip
              key={c.value}
              name="availability_chips"
              value={c.value}
              label={c.label}
            />
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="rating_band">Rough strength (optional)</Label>
        <p className="text-xs text-muted-foreground">
          Skip this if you will link Lichess or chess.com on the next screen.
        </p>
        <Select id="rating_band" name="rating_band" defaultValue="">
          <option value="">Prefer not to say</option>
          {RATING_BANDS.map((b) => (
            <option key={b.value} value={b.value}>
              {b.label}
            </option>
          ))}
        </Select>
      </div>

      <label className="flex items-center justify-between rounded-lg border border-border px-3 py-3">
        <span className="text-sm">
          Show me in the players directory
          <span className="block text-xs text-muted-foreground">
            You can hide anytime. Others only ever see a rough distance, like
            ~2 km, never your location.
          </span>
        </span>
        <input
          type="checkbox"
          name="visible"
          defaultChecked
          className="h-5 w-5 accent-[hsl(var(--primary))]"
        />
      </label>

      {state.error && (
        <p className="text-sm text-destructive">{state.error}</p>
      )}

      <Button type="submit" size="lg" disabled={pending}>
        {pending ? "Saving..." : "Finish"}
      </Button>
    </form>
  );
}
