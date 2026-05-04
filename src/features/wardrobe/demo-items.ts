import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

const demoWardrobeItems = [
  {
    name: "Oxford White Shirt",
    category: "top",
    subcategory: "shirt",
    colors: ["White"],
    season_tags: ["All-season"],
    material_tags: ["Cotton"],
    brand: "Minimal Club",
    fit: "Slim",
    image_url: "https://images.unsplash.com/photo-1596755094514-f87e34085b2c?auto=format&fit=crop&w=900&q=80"
  },
  {
    name: "Navy Formal Trousers",
    category: "bottom",
    subcategory: "trousers",
    colors: ["Navy"],
    season_tags: ["All-season"],
    material_tags: ["Wool Blend"],
    brand: "Urban Tailor",
    fit: "Regular",
    image_url: "https://images.unsplash.com/photo-1473966968600-fa801b869a1a?auto=format&fit=crop&w=900&q=80"
  }
] as const;

export async function seedDemoWardrobeForNewUser(
  supabase: SupabaseClient<Database>,
  userId: string
) {
  const { count, error: countError } = await supabase
    .from("wardrobe_items")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId);

  if (countError || (count ?? 0) > 0) {
    return;
  }

  await supabase.from("wardrobe_items").insert(
    demoWardrobeItems.map((item) => ({
      user_id: userId,
      name: item.name,
      category: item.category,
      subcategory: item.subcategory,
      colors: [...item.colors],
      season_tags: [...item.season_tags],
      material_tags: [...item.material_tags],
      brand: item.brand,
      image_url: item.image_url,
      ai_attributes: {
        source: "demo_seed",
        fit: item.fit,
        fabric: item.material_tags[0],
        color: item.colors[0],
        season: item.season_tags[0]
      }
    }))
  );
}
