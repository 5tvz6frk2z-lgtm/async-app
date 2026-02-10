"use server"

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"
import { z } from "zod"

const updateProfileSchema = z.object({
    name: z.string().min(1, "Name cannot be empty").max(100, "Name must be less than 100 characters"),
})

export async function updateProfileName(newName: string) {
    const supabase = await createClient()

    // Validate input
    const result = updateProfileSchema.safeParse({ name: newName })
    if (!result.success) {
        return { error: result.error.issues[0].message }
    }

    try {
        const { data: { user }, error: userError } = await supabase.auth.getUser()
        if (userError || !user) throw new Error("Unauthorized")

        const { error } = await supabase
            .from("profiles")
            .update({ name: result.data.name })
            .eq("id", user.id)

        if (error) {
            console.error("Profile update error:", error)
            return { error: "Failed to update profile" }
        }

        revalidatePath("/dashboard")
        return { success: true }
    } catch (e) {
        return { error: "An unexpected error occurred" }
    }
}

const updateAvatarSchema = z.object({
    url: z.string().url("Must be a valid URL").or(z.literal("")),
})

export async function updateProfileAvatar(newUrl: string) {
    const supabase = await createClient()

    const result = updateAvatarSchema.safeParse({ url: newUrl })
    if (!result.success) {
        return { error: result.error.issues[0].message }
    }

    try {
        const { data: { user }, error: userError } = await supabase.auth.getUser()
        if (userError || !user) throw new Error("Unauthorized")

        const { error } = await supabase
            .from("profiles")
            .update({ avatar_url: result.data.url || null })
            .eq("id", user.id)

        if (error) {
            console.error("Avatar update error:", error)
            return { error: "Failed to update avatar" }
        }

        revalidatePath("/dashboard")
        revalidatePath("/profile")
        return { success: true }
    } catch (e) {
        return { error: "An unexpected error occurred" }
    }
}
