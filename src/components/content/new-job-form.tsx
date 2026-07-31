"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { CONTENT_LANGUAGE_MODE_LABELS, CONTENT_LANGUAGE_MODES } from "@/lib/constants";
import type { ContentLanguageMode } from "@/lib/constants";

export function NewJobForm() {
  const router = useRouter();
  const [inputType, setInputType] = useState<"url" | "text">("url");
  const [inputUrl, setInputUrl] = useState("");
  const [inputText, setInputText] = useState("");
  const [languageMode, setLanguageMode] = useState<ContentLanguageMode>("zh");
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    if (inputType === "url" && !inputUrl.trim()) {
      toast.error("Article URL is required");
      return;
    }
    if (inputType === "text" && inputText.trim().length < 200) {
      toast.error("Paste the full article text (at least ~200 characters)");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch("/api/content", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          inputType,
          inputUrl: inputType === "url" ? inputUrl.trim() : undefined,
          inputText: inputType === "text" ? inputText.trim() : undefined,
          languageMode,
        }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as { error?: string } | null;
        throw new Error(body?.error || `Request failed (${res.status})`);
      }
      const { id } = (await res.json()) as { id: string };
      toast.success("Generating illustrations…");
      setInputUrl("");
      setInputText("");
      router.push(`/content/${id}`);
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to start job");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm">Generate illustrations</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="flex gap-2">
          <Button
            type="button"
            variant={inputType === "url" ? "default" : "outline"}
            size="sm"
            onClick={() => setInputType("url")}
          >
            Article URL
          </Button>
          <Button
            type="button"
            variant={inputType === "text" ? "default" : "outline"}
            size="sm"
            onClick={() => setInputType("text")}
          >
            Paste text
          </Button>
        </div>

        {inputType === "url" ? (
          <div className="grid gap-2">
            <Label htmlFor="content-url">Article URL</Label>
            <Input
              id="content-url"
              type="url"
              placeholder="https://..."
              value={inputUrl}
              onChange={(e) => setInputUrl(e.target.value)}
            />
          </div>
        ) : (
          <div className="grid gap-2">
            <Label htmlFor="content-text">Article text</Label>
            <Textarea
              id="content-text"
              rows={8}
              placeholder="Paste the article text here…"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
            />
          </div>
        )}

        <div className="grid gap-2 sm:max-w-xs">
          <Label>Label language</Label>
          <Select value={languageMode} onValueChange={(v) => setLanguageMode(v as ContentLanguageMode)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {CONTENT_LANGUAGE_MODES.map((m) => (
                <SelectItem key={m} value={m}>
                  {CONTENT_LANGUAGE_MODE_LABELS[m]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Button onClick={submit} disabled={saving}>
            {saving ? "Generating…" : "Generate Illustrations"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
