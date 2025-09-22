import React, { useCallback, useMemo, useRef, useState } from "react"
import { Upload, X } from "lucide-react"
import { Button } from "@/components/ui/button"
// If you use shadcn toasts, uncomment next line and use toast(...)
// import { useToast } from "@/hooks/use-toast"

type UploadDropzoneProps = {
  onSelect: (files: File[]) => void
  accept?: string[]               // e.g. ["image/png", "application/pdf"]
  maxFiles?: number               // e.g. 5
  maxSizeMB?: number              // per file, e.g. 50
  className?: string
}

export default function UploadDropzone({
  onSelect,
  accept,
  maxFiles = 10,
  maxSizeMB = 100,
  className,
}: UploadDropzoneProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [files, setFiles] = useState<File[]>([])
  // const { toast } = useToast()

  const acceptSet = useMemo(() => (accept ? new Set(accept) : null), [accept])
  const maxBytes = maxSizeMB * 1024 * 1024

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return "0 B"
    const k = 1024
    const sizes = ["B", "KB", "MB", "GB"]
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`
  }

  const validate = (picked: File[]): File[] => {
    const errors: string[] = []
    let selected = picked

    if (selected.length + files.length > maxFiles) {
      selected = selected.slice(0, Math.max(0, maxFiles - files.length))
      errors.push(`You can upload up to ${maxFiles} files.`)
    }

    selected = selected.filter((f) => {
      if (f.size > maxBytes) {
        errors.push(`"${f.name}" exceeds ${maxSizeMB} MB.`)
        return false
      }
      if (acceptSet && !acceptSet.has(f.type)) {
        errors.push(`"${f.name}" type not allowed (${f.type || "unknown"}).`)
        return false
      }
      return true
    })

    if (errors.length) {
      // toast({ title: "Upload notice", description: errors.join(" "), variant: "destructive" })
      console.warn("[UploadDropzone] validation:", errors.join(" "))
    }
    return selected
  }

  const addFiles = useCallback(
    (picked: File[]) => {
      const valid = validate(picked)
      if (!valid.length) return
      const next = [...files, ...valid]
      setFiles(next)
      onSelect(next)
    },
    [files, onSelect]
  )

  const onInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const list = e.target.files
    if (!list) return
    addFiles(Array.from(list))
    e.target.value = "" // allow re-picking same files
  }

  const onDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
    if (e.dataTransfer.files?.length) {
      addFiles(Array.from(e.dataTransfer.files))
    }
  }

  const removeFile = (idx: number) => {
    const next = files.filter((_, i) => i !== idx)
    setFiles(next)
    onSelect(next)
  }

  return (
    <div className={className}>
      {/* Drop area */}
      <div
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") inputRef.current?.click()
        }}
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault()
          setIsDragging(true)
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={onDrop}
        className={[
          "flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-6 text-center transition",
          isDragging ? "border-accent bg-neutral-50" : "border-neutral-300",
        ].join(" ")}
      >
        <Upload className="mb-2 h-6 w-6 text-neutral-400" />
        <p className="text-sm text-neutral-600">
          Drag & drop files here, or <span className="font-medium text-accent">browse</span>
        </p>
        <p className="mt-1 text-xs text-neutral-400">
          {accept?.length ? `Accepts: ${accept.join(", ")}` : "Any file type"} · Max {maxFiles} files · {maxSizeMB} MB each
        </p>

        <input
          ref={inputRef}
          type="file"
          multiple
          onChange={onInputChange}
          className="hidden"
          // If you want browser-level filtering, you can pass accept as comma string (e.g. ".png,.pdf")
          // accept={accept?.join(",")}
        />
      </div>

      {/* Selected list */}
      {files.length > 0 && (
        <div className="mt-4 space-y-2">
          {files.map((f, idx) => (
            <div key={f.name + idx} className="flex items-center justify-between rounded-md border px-3 py-2">
              <div className="min-w-0">
                <p className="truncate text-sm">{f.name}</p>
                <p className="text-xs text-neutral-500">{formatBytes(f.size)}</p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-neutral-500 hover:text-black"
                onClick={(e) => {
                  e.stopPropagation()
                  removeFile(idx)
                }}
                aria-label={`Remove ${f.name}`}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
