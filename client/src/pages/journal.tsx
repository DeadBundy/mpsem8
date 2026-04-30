import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Plus, Edit, Trash2, Calendar, Heart } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAppLanguage } from "@/lib/language";

interface JournalEntry {
  id: string;
  title: string;
  content: string;
  mood?: string;
  tags: string | null;
  createdAt: string;
  updatedAt: string;
}

const MOODS = [
  { value: "happy", label: "Happy", emoji: "😊" },
  { value: "sad", label: "Sad", emoji: "😢" },
  { value: "angry", label: "Angry", emoji: "😠" },
  { value: "anxious", label: "Anxious", emoji: "😰" },
  { value: "calm", label: "Calm", emoji: "😌" },
  { value: "excited", label: "Excited", emoji: "🤩" },
  { value: "tired", label: "Tired", emoji: "😴" },
  { value: "grateful", label: "Grateful", emoji: "🙏" },
];

export default function Journal() {
  const { copy } = useAppLanguage();
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<JournalEntry | null>(null);
  const [formData, setFormData] = useState({
    title: "",
    content: "",
    mood: "",
    tags: [] as string[],
  });
  const { toast } = useToast();

  useEffect(() => {
    loadEntries();
  }, []);

  const loadEntries = async () => {
    try {
      const token = localStorage.getItem("authToken");
      const response = await fetch("/api/journal", {
        headers: {
          "Authorization": `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setEntries(data);
      }
    } catch (error) {
      toast({
        title: "Error",
        description: copy.loadJournalFailed,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const token = localStorage.getItem("authToken");
      const url = editingEntry ? `/api/journal/${editingEntry.id}` : "/api/journal";
      const method = editingEntry ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
        },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        toast({
          title: "Success",
          description: editingEntry ? copy.journalUpdated : copy.journalSaved,
        });
        loadEntries();
        setIsDialogOpen(false);
        resetForm();
      }
    } catch (error) {
      toast({
        title: "Error",
        description: copy.saveJournalFailed,
        variant: "destructive",
      });
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm(copy.deleteConfirm)) return;

    try {
      const token = localStorage.getItem("authToken");
      const response = await fetch(`/api/journal/${id}`, {
        method: "DELETE",
        headers: {
          "Authorization": `Bearer ${token}`,
        },
      });

      if (response.ok) {
        toast({
          title: "Success",
          description: copy.journalDeleted,
        });
        loadEntries();
      }
    } catch (error) {
      toast({
        title: "Error",
        description: copy.deleteJournalFailed,
        variant: "destructive",
      });
    }
  };

  const resetForm = () => {
    setFormData({
      title: "",
      content: "",
      mood: "",
      tags: [],
    });
    setEditingEntry(null);
  };

  const openEditDialog = (entry: JournalEntry) => {
    setEditingEntry(entry);
    setFormData({
      title: entry.title,
      content: entry.content,
      mood: entry.mood || "",
      tags: JSON.parse(entry.tags || "[]"),
    });
    setIsDialogOpen(true);
  };

  const addTag = (tag: string) => {
    if (tag && !formData.tags.includes(tag)) {
      setFormData(prev => ({
        ...prev,
        tags: [...prev.tags, tag],
      }));
    }
  };

  const removeTag = (tagToRemove: string) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags.filter(tag => tag !== tagToRemove),
    }));
  };

  if (isLoading) {
    return <div className="flex justify-center p-8">{copy.loading}</div>;
  }

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">{copy.journalTitle}</h1>
          <p className="text-gray-600 mt-2">{copy.journalDescription}</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={resetForm}>
              <Plus className="mr-2 h-4 w-4" />
              {copy.newEntry}
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingEntry ? copy.editEntry : copy.newJournalEntry}</DialogTitle>
              <DialogDescription>
                {copy.journalDialogDescription}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="title">{copy.title}</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                  placeholder={copy.giveEntryTitle}
                  required
                />
              </div>

              <div>
                <Label htmlFor="mood">{copy.howAreYouFeeling}</Label>
                <Select value={formData.mood} onValueChange={(value) => setFormData(prev => ({ ...prev, mood: value }))}>
                  <SelectTrigger>
                    <SelectValue placeholder={copy.selectMood} />
                  </SelectTrigger>
                  <SelectContent>
                    {MOODS.map((mood) => (
                      <SelectItem key={mood.value} value={mood.value}>
                        {mood.emoji} {mood.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="content">{copy.content}</Label>
                <Textarea
                  id="content"
                  value={formData.content}
                  onChange={(e) => setFormData(prev => ({ ...prev, content: e.target.value }))}
                  placeholder={copy.writeAboutDay}
                  rows={8}
                  required
                />
              </div>

              <div>
                <Label>{copy.tags}</Label>
                <div className="flex flex-wrap gap-2 mb-2">
                  {formData.tags.map((tag) => (
                    <Badge key={tag} variant="secondary" className="cursor-pointer" onClick={() => removeTag(tag)}>
                      {tag} ×
                    </Badge>
                  ))}
                </div>
                <Input
                  placeholder={copy.addTag}
                  onKeyPress={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      const input = e.currentTarget;
                      addTag(input.value.trim());
                      input.value = "";
                    }
                  }}
                />
              </div>

              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                  {copy.cancel}
                </Button>
                <Button type="submit">
                  {editingEntry ? copy.update : copy.save} {copy.entry}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {entries.map((entry) => (
          <Card key={entry.id} className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle className="text-lg">{entry.title}</CardTitle>
                  <CardDescription className="flex items-center gap-2 mt-1">
                    <Calendar className="h-4 w-4" />
                    {new Date(entry.createdAt).toLocaleDateString()}
                    {entry.mood && (
                      <>
                        <Heart className="h-4 w-4 ml-2" />
                        {MOODS.find(m => m.value === entry.mood)?.emoji}
                      </>
                    )}
                  </CardDescription>
                </div>
                <div className="flex gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => openEditDialog(entry)}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDelete(entry.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600 line-clamp-3 mb-3">
                {entry.content}
              </p>
              {JSON.parse(entry.tags || "[]").length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {JSON.parse(entry.tags || "[]").map((tag: string) => (
                    <Badge key={tag} variant="outline" className="text-xs">
                      {tag}
                    </Badge>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {entries.length === 0 && (
        <div className="text-center py-12">
          <Heart className="mx-auto h-12 w-12 text-gray-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">{copy.noJournalEntries}</h3>
          <p className="text-gray-600 mb-4">{copy.writeFirstEntryDescription}</p>
          <Button onClick={() => setIsDialogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            {copy.writeFirstEntry}
          </Button>
        </div>
      )}
    </div>
  );
}
