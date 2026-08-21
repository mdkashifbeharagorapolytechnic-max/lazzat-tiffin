"use client";

import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { supabase } from "@/lib/supabase";

type Meal = {
  name: string;
  items: string[];
  image: string;
  available: boolean;
};

type DayMenu = {
  day: string;
  shortDay: string;
  dayNumber: number;
  lunch: Meal;
  dinner: Meal;
};

const days = [
  {
    day: "Monday",
    shortDay: "Mon",
    dayNumber: 1,
  },
  {
    day: "Tuesday",
    shortDay: "Tue",
    dayNumber: 2,
  },
  {
    day: "Wednesday",
    shortDay: "Wed",
    dayNumber: 3,
  },
  {
    day: "Thursday",
    shortDay: "Thu",
    dayNumber: 4,
  },
  {
    day: "Friday",
    shortDay: "Fri",
    dayNumber: 5,
  },
  {
    day: "Saturday",
    shortDay: "Sat",
    dayNumber: 6,
  },
  {
    day: "Sunday",
    shortDay: "Sun",
    dayNumber: 0,
  },
];

const fallbackImages: Record<string, string> = {
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

function getTodayIndex() {
  const day = new Date().getDay();

  return day === 0 ? 6 : day - 1;
}

function createFallbackMenu(): DayMenu[] {
  return days.map((day) => ({
    ...day,

    lunch: {
      name: "Lunch",
      items: ["Roti", "Sabji"],
      image:
        fallbackImages[`${day.dayNumber}-lunch`],
      available: true,
    },

    dinner: {
      name: "Dinner",
      items: ["Rice", "Dal"],
      image:
        fallbackImages[`${day.dayNumber}-dinner`],
      available: true,
    },
  }));
}

export default function Menu() {
  const todayIndex = useMemo(
    () => getTodayIndex(),
    []
  );

  const [selectedDay, setSelectedDay] =
    useState(todayIndex);

  const [weeklyMenu, setWeeklyMenu] =
    useState<DayMenu[]>(createFallbackMenu);

  const [loading, setLoading] =
    useState(true);

  useEffect(() => {
    loadMenu();
  }, []);

  async function loadMenu() {
    const { data, error } = await supabase
      .from("menu_items")
      .select(
        "day_name, day_number, meal_type, items, image_url, available"
      )
      .order("day_number", {
        ascending: true,
      });

    if (error) {
      console.error("Menu load error:", error);
      setLoading(false);
      return;
    }

    if (!data || data.length === 0) {
      setLoading(false);
      return;
    }

    const newMenu = days.map((day) => {
      const lunch = data.find(
        (item) =>
          item.day_number === day.dayNumber &&
          item.meal_type === "lunch"
      );

      const dinner = data.find(
        (item) =>
          item.day_number === day.dayNumber &&
          item.meal_type === "dinner"
      );

      return {
        ...day,

        lunch: {
          name: "Lunch",
          items: lunch?.items || [],
          image:
            lunch?.image_url ||
            fallbackImages[
              `${day.dayNumber}-lunch`
            ],
          available:
            lunch?.available ?? true,
        },

        dinner: {
          name: "Dinner",
          items: dinner?.items || [],
          image:
            dinner?.image_url ||
            fallbackImages[
              `${day.dayNumber}-dinner`
            ],
          available:
            dinner?.available ?? true,
        },
      };
    });

    setWeeklyMenu(newMenu);
    setLoading(false);
  }

  const selectedMenu =
    weeklyMenu[selectedDay];

  return (
    <section
      id="menu"
      className="bg-orange-50 py-24"
    >
      <div className="mx-auto max-w-7xl px-6">

        {/* HEADING */}
        <motion.div
          initial={{
            opacity: 0,
            y: 40,
          }}
          whileInView={{
            opacity: 1,
            y: 0,
          }}
          transition={{
            duration: 0.8,
          }}
          viewport={{
            once: true,
          }}
          className="text-center"
        >
          <h2 className="text-4xl font-bold text-gray-900">
            Today&apos;s Menu
          </h2>

          <p className="mt-4 text-gray-600">
            Fresh homemade meals prepared every day.
          </p>
        </motion.div>

        {/* TODAY BADGE */}
        <div className="mt-8 flex justify-center">
          <div className="rounded-full bg-orange-500 px-5 py-2 text-sm font-bold text-white shadow">
            🍱 Today&apos;s Menu —{" "}
            {weeklyMenu[todayIndex]?.day}
          </div>
        </div>

        {/* DAY SELECTOR */}
        <div className="mt-10 flex gap-3 overflow-x-auto pb-3 md:justify-center">

          {weeklyMenu.map(
            (day, index) => (
              <button
                key={day.day}
                type="button"
                onClick={() =>
                  setSelectedDay(index)
                }
                className={`min-w-[85px] rounded-xl px-4 py-3 font-semibold transition ${
                  selectedDay === index
                    ? "bg-orange-500 text-white shadow-lg"
                    : "bg-white text-gray-700 shadow hover:bg-orange-100"
                }`}
              >
                {day.shortDay}

                {index === todayIndex && (
                  <span className="mt-1 block text-xs">
                    Today
                  </span>
                )}
              </button>
            )
          )}

        </div>

        {/* LOADING */}
        {loading && (
          <div className="mt-10 text-center text-gray-500">
            Loading today&apos;s menu...
          </div>
        )}

        {/* SELECTED DAY */}
        {selectedMenu && (
          <motion.div
            key={selectedMenu.day}
            initial={{
              opacity: 0,
              y: 20,
            }}
            animate={{
              opacity: 1,
              y: 0,
            }}
            transition={{
              duration: 0.5,
            }}
            className="mt-10"
          >

            <h3 className="text-center text-3xl font-bold text-gray-900">
              {selectedMenu.day}&apos;s Menu
            </h3>

            {/* LUNCH + DINNER */}
            <div className="mt-10 grid gap-8 md:grid-cols-2">

              <MealCard
                meal={selectedMenu.lunch}
                type="🍛 Lunch"
                index={0}
              />

              <MealCard
                meal={selectedMenu.dinner}
                type="🌙 Dinner"
                index={1}
              />

            </div>
          </motion.div>
        )}

      </div>
    </section>
  );
}

function MealCard({
  meal,
  type,
  index,
}: {
  meal: Meal;
  type: string;
  index: number;
}) {
  return (
    <motion.div
      initial={{
        opacity: 0,
        y: 40,
      }}
      whileInView={{
        opacity: 1,
        y: 0,
      }}
      transition={{
        duration: 0.6,
        delay: index * 0.15,
      }}
      viewport={{
        once: true,
      }}
      whileHover={{
        y: -8,
      }}
      className="overflow-hidden rounded-3xl bg-white shadow-xl"
    >

      {/* IMAGE */}
      <img
        src={meal.image}
        alt={`${meal.name} menu`}
        className="h-64 w-full object-cover"
      />

      {/* CONTENT */}
      <div className="p-7">

        <div className="flex items-center justify-between gap-4">

          <h4 className="text-2xl font-bold text-gray-900">
            {type}
          </h4>

          <span
            className={`rounded-full px-3 py-1 text-sm font-semibold ${
              meal.available
                ? "bg-orange-100 text-orange-600"
                : "bg-red-100 text-red-600"
            }`}
          >
            {meal.available
              ? meal.name
              : "Not Available"}
          </span>

        </div>

        {/* ITEMS */}
        <div className="mt-6">

          <p className="mb-3 font-semibold text-gray-700">
            {meal.available
              ? "Today's Items:"
              : "Meal Status:"}
          </p>

          {meal.available ? (
            <ul className="space-y-3">
              {meal.items.map(
                (item, itemIndex) => (
                  <li
                    key={`${item}-${itemIndex}`}
                    className="flex items-center gap-3 text-gray-600"
                  >
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-green-100 text-sm text-green-600">
                      ✓
                    </span>

                    {item}
                  </li>
                )
              )}
            </ul>
          ) : (
            <div className="rounded-xl bg-red-50 p-4 font-semibold text-red-600">
              This meal is not available today.
            </div>
          )}

        </div>

      </div>
    </motion.div>
  );
}