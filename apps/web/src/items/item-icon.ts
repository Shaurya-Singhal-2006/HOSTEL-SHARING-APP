import { Bike, BookOpen, Brush, Calculator, CookingPot, Drill, Dumbbell, Fan, Flashlight, Hammer, Headphones, Laptop, Package, Plug, Scissors, Shirt, Speaker, Umbrella, Utensils, Wind, Wrench } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

const titleRules: Array<[RegExp, LucideIcon]> = [
  [/drill/i, Drill], [/screwdriver|spanner|wrench|plier|toolbox/i, Wrench], [/hammer/i, Hammer], [/iron/i, Shirt],
  [/kettle|mixer|cooker|toaster/i, CookingPot], [/pan|utensil/i, Utensils], [/extension|board|socket|plug|charger|cable/i, Plug],
  [/laptop|stand/i, Laptop], [/fan|cooler/i, Fan], [/hair dryer|trimmer/i, Wind], [/dryer/i, Wind],
  [/bucket|mop|broom/i, Brush], [/bike|cycle/i, Bike], [/ball|bat|racket/i, Dumbbell],
  [/book|notes/i, BookOpen], [/calculator/i, Calculator], [/umbrella/i, Umbrella], [/torch/i, Flashlight],
  [/speaker/i, Speaker], [/headphone/i, Headphones], [/scissor/i, Scissors],
]

export function getItemIcon(title: string, category: string): LucideIcon {
  const match = titleRules.find(([pattern]) => pattern.test(title))
  if (match) return match[1]
  const byCategory: Record<string, LucideIcon> = {
    Tools: Wrench, Electronics: Plug, Kitchen: Utensils, Cleaning: Brush,
    Study: BookOpen, Sports: Dumbbell, 'Clothing/Laundry': Shirt, Other: Package,
  }
  return byCategory[category] ?? Package
}

