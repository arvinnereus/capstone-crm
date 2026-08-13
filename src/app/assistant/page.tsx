import { AssistantChat } from "@/components/assistant/assistant-chat";
import { VoiceOrb } from "@/components/assistant/voice-orb";
import { getActiveBrandView } from "@/lib/brand-context";
import { brandViewLabel } from "@/lib/brands";

export const dynamic = "force-dynamic";

export default async function AssistantPage() {
  const brand = await getActiveBrandView();
  const label = brandViewLabel(brand);

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-4">
      <div>
        <h2 className="text-lg font-semibold">Joseph · {label}</h2>
        <p className="text-sm text-muted-foreground">
          Talk or type — Joseph answers from live CRM data. Switch business in the sidebar to change scope.
        </p>
      </div>
      <VoiceOrb brandLabel={label} />
      <AssistantChat brandLabel={label} />
    </div>
  );
}
