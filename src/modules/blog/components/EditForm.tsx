"use client";

import {
  InputField,
  ImageField,
  GalleryField,
  SlugField,
  MarkdownField,
  TagField,
  TextareaField,
} from "@kenstack/admin/forms";
import MetaFields from "@kenstack/admin/components/MetaFields";

export default function BlogForm() {
  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
      <div className="space-y-4 lg:col-span-2">
        <div className="flex gap-4">
          <ImageField label="Image" name="image" />
          <div className="flex-1 space-y-4">
            <InputField label="Title" name="title" />
            <SlugField label="Slug" name="slug" />
          </div>
        </div>
        <TextareaField label="Description" name="description" />
        <GalleryField label="Gallery" name="gallery" />
        <MarkdownField label="Content" name="content" />
      </div>
      <div className="space-y-4">
        <MetaFields />
        <TagField label="Tags" name="tags" />
      </div>
    </div>
  );
}
