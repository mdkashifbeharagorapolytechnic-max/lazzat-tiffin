"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

type MealType = "lunch" | "dinner";

type MenuItem = {
  id: string;
  day_name: string;
  day_number: number;
  meal_type: MealType;
  items: string[];
  image_url: string | null;
  available: boolean;
};

const days = [
  { number: 1, name: "Monday", short: "Mon" },
  { number: 2, name: "Tuesday", short: "Tue" },
  { number: 3, name: "Wednesday", short: "Wed" },
  { number: 4, name: "Thursday", short: "Thu" },
  { number: 5, name: "Friday", short: "Fri" },
  { number: 6, name: "Saturday", short: "Sat" },
  { number: 0, name: "Sunday", short: "Sun" },
];

const defaultImages: Record<string, string> = {
  "1-lunch":
    "https://images.unsplash.com/photo-1547592180-85f173990554?w=900",

  "1-dinner":
    "https://images.unsplash.com/photo-1603894584373-5ac82b2ae398?w=900",

  "2-lunch":
    "https://images.unsplash.com/photo-1547592180-85f173990554?w=900",

  "2-dinner":
    "https://images.unsplash.com/photo-1603894584373-5ac82b2ae398?w=900",

  "3-lunch":
    "https://images.unsplash.com/photo-1601050690597-df0568f70950?w=900",

  "3-dinner":
    "https://images.unsplash.com/photo-1601050690597-df0568f70950?w=900",

  "4-lunch":
    "https://images.unsplash.com/photo-1547592180-85f173990554?w=900",

  "4-dinner":
    "https://images.unsplash.com/photo-1603894584373-5ac82b2ae398?w=900",

  "5-lunch":
    "https://images.unsplash.com/photo-1547592180-85f173990554?w=900",

  "5-dinner":
    "https://images.unsplash.com/photo-1517244683847-7456b63c5969?w=900",

  "6-lunch":
    "https://images.unsplash.com/photo-1563379926898-05f4575a45d8?w=900",

  "6-dinner":
    "https://images.unsplash.com/photo-1547592180-85f173990554?w=900",

  "0-lunch":
    "https://images.unsplash.com/photo-1563379926898-05f4575a45d8?w=900",

  "0-dinner":
    "https://images.unsplash.com/photo-1603894584373-5ac82b2ae398?w=900",
};

export default function AdminMenuPage() {
  const [menus, setMenus] = useState<MenuItem[]>([]);
  const [selectedDay, setSelectedDay] = useState(1);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    loadMenus();
  }, []);

  async function loadMenus() {
    setLoading(true);
    setError("");

    const { data, error } = await supabase
      .from("menu_items")
      .select("*")
      .order("day_number", { ascending: true })
      .order("meal_type", { ascending: true });

    if (error) {
      console.error(error);
      setError(error.message);
      setLoading(false);
      return;
    }

    setMenus((data || []) as MenuItem[]);
    setLoading(false);
  }

  function getMenu(dayNumber: number, mealType: MealType) {
    return menus.find(
      (menu) =>
        menu.day_number === dayNumber &&
        menu.meal_type === mealType
    );
  }

  function updateItems(
    dayNumber: number,
    mealType: MealType,
    value: string
  ) {
    setMenus((current) =>
      current.map((menu) => {
        if (
          menu.day_number !== dayNumber ||
          menu.meal_type !== mealType
        ) {
          return menu;
        }

        const items = value
          .split("\n")
          .map((item) => item.trim())
          .filter(Boolean);

        return {
          ...menu,
          items,
        };
      })
    );
  }

  function updateAvailability(
    dayNumber: number,
    mealType: MealType,
    available: boolean
  ) {
    setMenus((current) =>
      current.map((menu) => {
        if (
          menu.day_number !== dayNumber ||
          menu.meal_type !== mealType
        ) {
          return menu;
        }

        return {
          ...menu,
          available,
        };
      })
    );
  }

  async function handleImageUpload(
    dayNumber: number,
    mealType: MealType,
    file: File
  ) {
    setError("");
    setMessage("");

    if (!file.type.startsWith("image/")) {
      setError("Please select an image file.");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setError("Image size must be 5 MB or less.");
      return;
    }

    setSaving(true);

    try {
      const extension =
        file.name.split(".").pop()?.toLowerCase() || "jpg";

      const filePath = `${dayNumber}-${mealType}-${Date.now()}.${extension}`;

      const { error: uploadError } = await supabase.storage
        .from("menu-images")
        .upload(filePath, file, {
          cacheControl: "3600",
          upsert: false,
          contentType: file.type,
        });

      if (uploadError) {
        throw uploadError;
      }

      const { data } = supabase.storage
        .from("menu-images")
        .getPublicUrl(filePath);

      const imageUrl = data.publicUrl;

      setMenus((current) =>
        current.map((menu) => {
          if (
            menu.day_number !== dayNumber ||
            menu.meal_type !== mealType
          ) {
            return menu;
          }

          return {
            ...menu,
            image_url: imageUrl,
          };
        })
      );

      const { error: updateError } = await supabase
        .from("menu_items")
        .update({
          image_url: imageUrl,
          updated_at: new Date().toISOString(),
        })
        .eq("day_number", dayNumber)
        .eq("meal_type", mealType);

      if (updateError) {
        throw updateError;
      }

      setMessage("Image uploaded successfully.");
    } catch (err: any) {
      console.error(err);
      setError(
        err?.message || "Unable to upload image."
      );
    } finally {
      setSaving(false);
    }
  }

  async function saveMeal(
    dayNumber: number,
    mealType: MealType
  ) {
    const menu = getMenu(dayNumber, mealType);

    if (!menu) {
      setError("Menu record not found.");
      return;
    }

    setSaving(true);
    setError("");
    setMessage("");

    try {
      const { error } = await supabase
        .from("menu_items")
        .update({
          items: menu.items,
          available: menu.available,
          image_url: menu.image_url,
          updated_at: new Date().toISOString(),
        })
        .eq("day_number", dayNumber)
        .eq("meal_type", mealType);

      if (error) {
        throw error;
      }

      setMessage(
        `${menu.day_name} ${mealType} saved successfully.`
      );

      await loadMenus();
    } catch (err: any) {
      console.error(err);

      setError(
        err?.message || "Unable to save menu."
      );
    } finally {
      setSaving(false);
    }
  }

  const selectedDayData = days.find(
    (day) => day.number === selectedDay
  );

  const lunch = getMenu(selectedDay, "lunch");
  const dinner = getMenu(selectedDay, "dinner");

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="mx-auto max-w-7xl">
          <div className="rounded-xl bg-white p-10 text-center shadow-sm">
            Loading menu...
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">
      <div className="mx-auto max-w-7xl">

        {/* HEADER */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">
            Menu Management
          </h1>

          <p className="mt-2 text-sm text-gray-500">
            Change weekly lunch and dinner menu and upload food
            images directly from your PC.
          </p>
        </div>

        {/* MESSAGE */}
        {message && (
          <div className="mb-6 rounded-xl border border-green-200 bg-green-50 p-4 text-sm font-semibold text-green-700">
            {message}
          </div>
        )}

        {error && (
          <div className="mb-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700">
            {error}
          </div>
        )}

        {/* DAY SELECTOR */}
        <div className="mb-8 overflow-x-auto">
          <div className="flex min-w-max gap-3">
            {days.map((day) => (
              <button
                key={day.number}
                type="button"
                onClick={() => {
                  setSelectedDay(day.number);
                  setMessage("");
                  setError("");
                }}
                className={`rounded-xl px-6 py-3 text-sm font-bold transition ${
                  selectedDay === day.number
                    ? "bg-green-600 text-white shadow"
                    : "bg-white text-gray-700 shadow-sm hover:bg-gray-100"
                }`}
              >
                {day.name}
              </button>
            ))}
          </div>
        </div>

        {/* SELECTED DAY */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900">
            {selectedDayData?.name}
          </h2>
        </div>

        {/* MEALS */}
        <div className="grid gap-8 lg:grid-cols-2">

          <MealEditor
            menu={lunch}
            title="🍛 Lunch"
            saving={saving}
            onItemsChange={(value) =>
              updateItems(selectedDay, "lunch", value)
            }
            onAvailabilityChange={(value) =>
              updateAvailability(
                selectedDay,
                "lunch",
                value
              )
            }
            onImageUpload={(file) =>
              handleImageUpload(
                selectedDay,
                "lunch",
                file
              )
            }
            onSave={() =>
              saveMeal(selectedDay, "lunch")
            }
          />

          <MealEditor
            menu={dinner}
            title="🌙 Dinner"
            saving={saving}
            onItemsChange={(value) =>
              updateItems(selectedDay, "dinner", value)
            }
            onAvailabilityChange={(value) =>
              updateAvailability(
                selectedDay,
                "dinner",
                value
              )
            }
            onImageUpload={(file) =>
              handleImageUpload(
                selectedDay,
                "dinner",
                file
              )
            }
            onSave={() =>
              saveMeal(selectedDay, "dinner")
            }
          />

        </div>

        {/* INFO */}
        <div className="mt-8 rounded-xl border border-orange-200 bg-orange-50 p-5">
          <h3 className="font-bold text-orange-800">
            How to edit menu
          </h3>

          <ul className="mt-3 space-y-2 text-sm text-orange-700">
            <li>
              • Put each food item on a separate line.
            </li>
            <li>
              • Select an image from your PC.
            </li>
            <li>
              • Image maximum size is 5 MB.
            </li>
            <li>
              • Click Save Menu after changing food items.
            </li>
            <li>
              • Friday lunch can be disabled because lunch is
              not available.
            </li>
          </ul>
        </div>

      </div>
    </div>
  );
}

function MealEditor({
  menu,
  title,
  saving,
  onItemsChange,
  onAvailabilityChange,
  onImageUpload,
  onSave,
}: {
  menu: MenuItem | undefined;
  title: string;
  saving: boolean;
  onItemsChange: (value: string) => void;
  onAvailabilityChange: (value: boolean) => void;
  onImageUpload: (file: File) => void;
  onSave: () => void;
}) {
  if (!menu) {
    return (
      <div className="rounded-2xl bg-white p-8 shadow-sm">
        <p className="text-red-600">
          Menu record not found.
        </p>
      </div>
    );
  }

  const image =
    menu.image_url ||
    defaultImages[
      `${menu.day_number}-${menu.meal_type}`
    ];

  return (
    <div className="overflow-hidden rounded-2xl bg-white shadow-sm">

      {/* IMAGE */}
      <div className="relative">
        <img
          src={image}
          alt={`${menu.day_name} ${menu.meal_type}`}
          className="h-64 w-full object-cover"
        />

        <div className="absolute left-4 top-4 rounded-full bg-black/60 px-4 py-2 text-sm font-bold text-white">
          {title}
        </div>
      </div>

      <div className="p-6">

        {/* AVAILABILITY */}
        <div className="mb-6 flex items-center justify-between rounded-xl bg-gray-50 p-4">
          <div>
            <p className="font-bold text-gray-900">
              Meal Available
            </p>

            <p className="mt-1 text-xs text-gray-500">
              Disable this when meal is not provided.
            </p>
          </div>

          <button
            type="button"
            onClick={() =>
              onAvailabilityChange(!menu.available)
            }
            className={`relative h-7 w-12 rounded-full transition ${
              menu.available
                ? "bg-green-600"
                : "bg-gray-300"
            }`}
          >
            <span
              className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow transition ${
                menu.available
                  ? "left-6"
                  : "left-1"
              }`}
            />
          </button>
        </div>

        {/* ITEMS */}
        <label className="block text-sm font-bold text-gray-800">
          Food Items
        </label>

        <p className="mt-1 text-xs text-gray-500">
          One item per line
        </p>

        <textarea
          value={menu.items.join("\n")}
          onChange={(event) =>
            onItemsChange(event.target.value)
          }
          rows={6}
          className="mt-3 w-full rounded-xl border border-gray-300 p-4 text-sm outline-none focus:border-green-500 focus:ring-2 focus:ring-green-100"
          placeholder={"Roti\nSabji\nDal"}
        />

        {/* IMAGE UPLOAD */}
        <div className="mt-6">
          <label className="block text-sm font-bold text-gray-800">
            Food Image
          </label>

          <p className="mt-1 text-xs text-gray-500">
            Select an image from your PC. Maximum 5 MB.
          </p>

          <label className="mt-3 flex cursor-pointer items-center justify-center rounded-xl border-2 border-dashed border-gray-300 bg-gray-50 px-5 py-6 text-center transition hover:border-green-500 hover:bg-green-50">
            <div>
              <div className="text-3xl">
                📷
              </div>

              <div className="mt-2 text-sm font-bold text-gray-700">
                Choose Image from PC
              </div>

              <div className="mt-1 text-xs text-gray-500">
                JPG, PNG or WEBP
              </div>
            </div>

            <input
              type="file"
              accept="image/jpeg,image/png,image/webp,image/jpg"
              className="hidden"
              onChange={(event) => {
                const file =
                  event.target.files?.[0];

                if (file) {
                  onImageUpload(file);
                }

                event.currentTarget.value = "";
              }}
            />
          </label>
        </div>

        {/* SAVE */}
        <button
          type="button"
          onClick={onSave}
          disabled={saving}
          className="mt-6 w-full rounded-xl bg-green-600 px-5 py-3 font-bold text-white transition hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {saving ? "Saving..." : `Save ${title}`}
        </button>

      </div>
    </div>
  );
}