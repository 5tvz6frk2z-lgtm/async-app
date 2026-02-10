"use client"

import { useAuth } from "@/components/providers/AuthProvider"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { toast } from "sonner"
import { updateProfileName, updateProfileAvatar } from "./actions"
import { useState, useEffect, useCallback } from "react"
import { Loader2, Save, User, UserCircle, ArrowLeft, UploadCloud, Camera } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { useRouter } from "next/navigation"
import { useDropzone } from "react-dropzone"
import { ImageCropper } from "@/components/ui/image-cropper"
import { createClient } from "@/lib/supabase/client"

export default function ProfilePage() {
    const { user, profile: authProfile } = useAuth()
    const router = useRouter()

    // Local state
    const [name, setName] = useState("")
    const [avatarUrl, setAvatarUrl] = useState("")
    const [isSaving, setIsSaving] = useState(false)

    // Upload State
    const [selectedFile, setSelectedFile] = useState<string | null>(null)
    const [isCropperOpen, setIsCropperOpen] = useState(false)
    const [showUrlInput, setShowUrlInput] = useState(false)
    const [isUploading, setIsUploading] = useState(false)
    const supabase = createClient()

    const onDrop = useCallback((acceptedFiles: File[]) => {
        if (acceptedFiles && acceptedFiles.length > 0) {
            const file = acceptedFiles[0]
            const reader = new FileReader()
            reader.onload = () => {
                setSelectedFile(reader.result as string)
                setIsCropperOpen(true)
            }
            reader.readAsDataURL(file)
        }
    }, [])

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop,
        accept: {
            'image/png': ['.png'],
            'image/jpeg': ['.jpg', '.jpeg'],
            'image/webp': ['.webp']
        },
        maxFiles: 1
    })

    const handleCropComplete = async (bloppedBlob: Blob) => {
        if (!user) return

        setIsUploading(true)
        try {
            const fileName = `${user.id}/${Date.now()}.jpg` // User Folder Strategy

            // Upload to Supabase Storage 'avatars' bucket
            const { data, error } = await supabase.storage
                .from('avatars')
                .upload(fileName, bloppedBlob, {
                    contentType: 'image/jpeg',
                    upsert: true
                })

            if (error) {
                // If bucket doesn't exist, we might get error. 
                // Ideally we handle bucket creation server side or via SQL.
                // For now, assume bucket exists or throw.
                throw error
            }

            // Get Public URL
            const { data: { publicUrl } } = supabase.storage
                .from('avatars')
                .getPublicUrl(fileName)

            setAvatarUrl(publicUrl)

            // Auto-save just the avatar? Or just set URL?
            // Let's just set URL and let user click Save.
            // Or better UX: Auto-update the preview, but don't save to DB until "Save Changes"?
            // Ye, keep standard form behavior.

            toast.success("Image uploaded successfully")
        } catch (error: any) {
            console.error("Upload failed", error)
            toast.error("Failed to upload image. Please try again.")
        } finally {
            setIsUploading(false)
        }
    }

    // Sync state on load
    useEffect(() => {
        if (authProfile) {
            setName(authProfile.name || "")
            setAvatarUrl(authProfile.avatar_url || "")
        }
    }, [authProfile])

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault()
        setIsSaving(true)

        try {
            // Update Name
            if (name !== authProfile?.name) {
                const nameResult = await updateProfileName(name)
                if (nameResult.error) throw new Error(nameResult.error)
            }

            // Update Avatar
            if (avatarUrl !== authProfile?.avatar_url) {
                const avatarResult = await updateProfileAvatar(avatarUrl)
                if (avatarResult.error) throw new Error(avatarResult.error)
            }

            toast.success("Profile updated successfully")
            router.refresh()
        } catch (error: any) {
            toast.error(error.message || "Failed to update profile")
        } finally {
            setIsSaving(false)
        }
    }

    if (!user) return null

    return (
        <div className="min-h-screen bg-slate-50 py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-2xl mx-auto space-y-6">
                <Button
                    variant="ghost"
                    className="text-slate-500 hover:text-slate-900 -ml-2"
                    onClick={() => router.back()}
                >
                    <ArrowLeft className="w-4 h-4 mr-1" /> Back
                </Button>

                <div className="flex items-center gap-3">
                    <div className="p-3 bg-indigo-100 rounded-xl text-indigo-600">
                        <UserCircle className="w-8 h-8" />
                    </div>
                    <div>
                        <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Your Profile</h1>
                        <p className="text-slate-500">Manage your personal information and appearance.</p>
                    </div>
                </div>

                <form onSubmit={handleSave}>
                    <Card className="bg-white border-slate-100 shadow-xl shadow-slate-200/50 rounded-2xl overflow-hidden">
                        <CardHeader className="bg-slate-50/50 border-b border-slate-100 pb-4">
                            <CardTitle className="text-lg font-semibold text-slate-900">Public Profile</CardTitle>
                            <CardDescription>This information is visible to your team members.</CardDescription>
                        </CardHeader>

                        <CardContent className="space-y-8 pt-8 px-8">
                            {/* Avatar Section */}
                            <div className="flex flex-col sm:flex-row gap-6 items-start sm:items-center pb-6 border-b border-slate-100">
                                <div className="relative group">
                                    <Avatar className="w-24 h-24 border-4 border-white shadow-lg cursor-pointer" onClick={() => document.getElementById('avatar-dropzone')?.click()}>
                                        <AvatarImage src={avatarUrl} />
                                        <AvatarFallback className="bg-indigo-100 text-indigo-600 text-2xl font-bold">
                                            {name?.charAt(0) || user.email?.charAt(0)}
                                        </AvatarFallback>
                                    </Avatar>
                                    <div className="absolute inset-0 bg-black/40 rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer pointer-events-none">
                                        <Camera className="w-8 h-8 text-white" />
                                    </div>
                                </div>

                                <div className="flex-1 space-y-2 w-full">
                                    <Label className="text-slate-700">Profile Picture</Label>

                                    <div
                                        {...getRootProps()}
                                        className={`border-2 border-dashed rounded-xl p-6 text-center transition-colors cursor-pointer ${isDragActive ? 'border-indigo-500 bg-indigo-50' : 'border-slate-200 hover:border-indigo-300 hover:bg-slate-50'
                                            }`}
                                    >
                                        <input {...getInputProps()} id="avatar-dropzone" />
                                        <div className="flex flex-col items-center gap-2 text-sm text-slate-500">
                                            <UploadCloud className="w-8 h-8 text-indigo-400 mb-1" />
                                            {isDragActive ? (
                                                <p className="font-medium text-indigo-600">Drop the image here...</p>
                                            ) : (
                                                <>
                                                    <p className="font-medium text-slate-700">Click or drag image to upload</p>
                                                    <p className="text-xs text-slate-400">SVG, PNG, JPG (max. 5MB)</p>
                                                </>
                                            )}
                                        </div>
                                    </div>

                                    {/* Link Input Toggle */}
                                    <div className="pt-2">
                                        <Button
                                            type="button"
                                            variant="link"
                                            className="h-auto p-0 text-xs text-indigo-600"
                                            onClick={() => setShowUrlInput(!showUrlInput)}
                                        >
                                            {showUrlInput ? "Hide URL input" : "Or paste a direct URL"}
                                        </Button>

                                        {showUrlInput && (
                                            <Input
                                                id="avatar"
                                                placeholder="https://example.com/me.jpg"
                                                value={avatarUrl}
                                                onChange={(e) => setAvatarUrl(e.target.value)}
                                                className="mt-2 text-xs h-8 border-slate-200 focus:border-indigo-500"
                                            />
                                        )}
                                    </div>
                                </div>
                            </div>

                            <ImageCropper
                                imageSrc={selectedFile}
                                open={isCropperOpen}
                                onOpenChange={setIsCropperOpen}
                                onCropComplete={handleCropComplete}
                            />

                            {/* Name Section */}
                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <Label htmlFor="name" className="text-slate-700">Display Name</Label>
                                    <div className="relative">
                                        <User className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                                        <Input
                                            id="name"
                                            value={name}
                                            onChange={(e) => setName(e.target.value)}
                                            className="pl-9 border-slate-200 focus:border-indigo-500"
                                            placeholder="Your full name"
                                            maxLength={50}
                                        />
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="email" className="text-slate-700">Email Address</Label>
                                    <Input
                                        id="email"
                                        value={user.email || ""}
                                        disabled
                                        className="bg-slate-50 text-slate-500 border-slate-200"
                                    />
                                    <p className="text-xs text-slate-400">Email cannot be changed manually.</p>
                                </div>
                            </div>

                            <div className="pt-4 flex justify-end">
                                <Button
                                    type="submit"
                                    disabled={isSaving}
                                    className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-200 rounded-lg px-6"
                                >
                                    {isSaving ? (
                                        <><Loader2 className="w-4 h-4 animate-spin mr-2" /> Saving...</>
                                    ) : (
                                        <><Save className="w-4 h-4 mr-2" /> Save Changes</>
                                    )}
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                </form>
            </div>
        </div>
    )
}
