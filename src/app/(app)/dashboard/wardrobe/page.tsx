import { redirect } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import {
  WardrobeDashboardView,
  type WardrobeDashboardViewItem
} from "@/features/wardrobe/components/wardrobe-dashboard-view";
import { seedDemoWardrobeForNewUser } from "@/features/wardrobe/demo-items";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type WardrobeRow = {
  id: string;
  name: string;
  image_url: string;
  category: string;
  subcategory: string | null;
  brand: string | null;
  color: string | null;
  colors: string[] | null;
  season_tags: string[] | null;
  material_tags: string[] | null;
  ai_attributes: unknown;
};

type WardrobeFetchResult = {
  items: WardrobeDashboardViewItem[];
  error: string | null;
};

function getStringAttribute(value: unknown, key: string) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return "";
  }

  const attribute = (value as Record<string, unknown>)[key];
  return typeof attribute === "string" ? attribute : "";
}

function normalizeCategory(category: string, subcategory: string | null) {
  const value = (subcategory || category).toLowerCase();

  if (["shirt", "tshirt", "sweater", "top"].includes(value)) return "Top";
  if (["jeans", "skirt", "shorts", "trousers", "bottom"].includes(value)) return "Bottom";
  if (value === "shoes") return "Shoes";
  if (["outerwear", "blazer", "jacket", "coat"].includes(value)) return "Outerwear";

  return category ? category.charAt(0).toUpperCase() + category.slice(1) : "Other";
}

function mapWardrobeRow(row: WardrobeRow): WardrobeDashboardViewItem {
  return {
    id: row.id,
    name: row.name,
    image: row.image_url,
    category: normalizeCategory(row.category, row.subcategory),
    color: row.colors?.[0] ?? row.color ?? "",
    season: row.season_tags?.[0] ?? "all-season",
    fabric: row.material_tags?.[0] ?? "",
    brand: row.brand ?? "",
    fit: getStringAttribute(row.ai_attributes, "fit")
  };
}

async function getWardrobeItems(): Promise<WardrobeFetchResult> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?redirectTo=/dashboard/wardrobe");
  }

  const createQuery = () =>
    supabase
      .from("wardrobe_items")
      .select("id,name,image_url,category,subcategory,color,colors,season_tags,material_tags,ai_attributes")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

  let { data, error } = await createQuery().is("deleted_at", null);

  if (error?.code === "42703" || error?.code === "PGRST204") {
    ({ data, error } = await createQuery());
  }

  if (error) {
    return {
      items: [],
      error: "Could not load wardrobe items. Please refresh the page."
    };
  }

  if ((data ?? []).length === 0) {
    await seedDemoWardrobeForNewUser(supabase, user.id);
    ({ data, error } = await createQuery().is("deleted_at", null));

    if (error?.code === "42703" || error?.code === "PGRST204") {
      ({ data, error } = await createQuery());
    }
  }

  if (error) {
    return {
      items: [],
      error: "Could not load wardrobe items. Please refresh the page."
    };
  }

  return {
    items: ((data ?? []) as WardrobeRow[]).map(mapWardrobeRow),
    error: null
  };
}

export default async function WardrobeDashboardPage() {
  const { items, error } = await getWardrobeItems();

  return (
    <AppShell>
      <WardrobeDashboardView items={items} error={error} />
    </AppShell>
  );
}
