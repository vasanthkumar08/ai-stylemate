import { AppShell } from "@/components/layout/app-shell";
import { DashboardSidePanel } from "./dashboard-side-panel";
import { WardrobeDashboard, type WardrobeDashboardItem } from "@/features/wardrobe/components/wardrobe-dashboard";
import { seedDemoWardrobeForNewUser } from "@/features/wardrobe/demo-items";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type DashboardWardrobeRow = {
  id: string;
  name: string;
  category: string;
  subcategory: string | null;
  color: string | null;
  colors: string[] | null;
  season_tags: string[] | null;
  material_tags: string[] | null;
  image_url: string;
  created_at: string | null;
  ai_attributes: unknown;
};

function getStringAttribute(value: unknown, key: string) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return "";
  }

  const attribute = (value as Record<string, unknown>)[key];
  return typeof attribute === "string" ? attribute : "";
}

function mapDashboardWardrobeRow(row: DashboardWardrobeRow): WardrobeDashboardItem {
  return {
    id: row.id,
    name: row.name,
    category: row.category,
    subcategory: row.subcategory,
    brand: getStringAttribute(row.ai_attributes, "brand") || null,
    colors: row.colors?.length ? row.colors : row.color ? [row.color] : [],
    season_tags: row.season_tags ?? [],
    material_tags: row.material_tags ?? [],
    image_url: row.image_url,
    created_at: row.created_at ?? new Date().toISOString()
  };
}

function isMissingColumnError(code: string | undefined) {
  return code === "42703" || code === "PGRST204";
}

async function getWardrobeItems(): Promise<WardrobeDashboardItem[]> {
  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user }
    } = await supabase.auth.getUser();

    if (!user) {
      return [];
    }

    const query = () =>
      supabase
        .from("wardrobe_items")
        .select("id,name,category,subcategory,color,colors,season_tags,material_tags,image_url,created_at,ai_attributes")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

    let { data, error } = await query().is("deleted_at", null);

    if (isMissingColumnError(error?.code)) {
      ({ data, error } = await query());
    }

    if (error || !data) {
      console.error("[stylemate-dashboard-wardrobe]", {
        userId: user.id,
        code: error?.code,
        message: error?.message
      });
      return [];
    }

    if (data.length === 0) {
      await seedDemoWardrobeForNewUser(supabase, user.id);
      ({ data, error } = await query().is("deleted_at", null));

      if (isMissingColumnError(error?.code)) {
        ({ data, error } = await query());
      }
    }

    if (error || !data) {
      return [];
    }

    return (data as DashboardWardrobeRow[]).map(mapDashboardWardrobeRow);
  } catch {
    return [];
  }
}

export default async function DashboardPage() {
  const wardrobeItems = await getWardrobeItems();

  return (
    <AppShell>
      <div className="grid min-w-0 gap-6 xl:grid-cols-[minmax(0,1fr)_420px]">
        <WardrobeDashboard items={wardrobeItems} />
        <aside className="grid min-w-0 gap-6 xl:sticky xl:top-24 xl:self-start">
          <DashboardSidePanel />
        </aside>
      </div>
    </AppShell>
  );
}
