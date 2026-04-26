import * as React from "react"
import { Moon, Sun } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

export function ThemeToggle() {
  const [theme, setThemeState] = React.useState<"light" | "dark" | "system">("system")

  React.useEffect(() => {
    const isDark = document.documentElement.classList.contains("dark")
    setThemeState(isDark ? "dark" : "light")
  }, [])

  const setTheme = (newTheme: "light" | "dark" | "system") => {
    setThemeState(newTheme)
    const isDark =
      newTheme === "dark" ||
      (newTheme === "system" &&
        window.matchMedia("(prefers-color-scheme: dark)").matches)
    
    document.documentElement.classList[isDark ? "add" : "remove"]("dark")
    
    if (newTheme === "system") {
      localStorage.removeItem("theme")
    } else {
      localStorage.setItem("theme", newTheme)
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger render={<Button variant="outline" size="icon" className="cursor-pointer" />}>
        <Sun className="h-[1.2rem] w-[1.2rem] rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
        <Moon className="absolute h-[1.2rem] w-[1.2rem] rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
        <span className="sr-only">Toggle theme</span>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem className="cursor-pointer" onClick={() => setTheme("light")}>Светлая</DropdownMenuItem>
        <DropdownMenuItem className="cursor-pointer" onClick={() => setTheme("dark")}>Тёмная</DropdownMenuItem>
        <DropdownMenuItem className="cursor-pointer" onClick={() => setTheme("system")}>Системная</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
