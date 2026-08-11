"use client";

import type { ComponentType, ReactNode } from "react";

import FacebookIcon from "@kenstack/icons/Facebook";
import InstagramIcon from "@kenstack/icons/Instagram";
import LinkedInIcon from "@kenstack/icons/LinkedIn";
import YouTubeIcon from "@kenstack/icons/YouTube";

export default function SocialFields({
  fields: {
    facebookUrl: FacebookUrlField,
    instagramUrl: InstagramUrlField,
    linkedinUrl: LinkedInUrlField,
    youtubeUrl: YouTubeUrlField,
  },
}: {
  fields: SocialFieldComponents;
}) {
  return (
    <section className="space-y-4">
      <h2 className="text-lg font-semibold">Social media</h2>
      <FacebookUrlField
        startAdornment={<FacebookIcon className="text-[#0866ff]" />}
      />
      <InstagramUrlField
        startAdornment={<InstagramIcon className="text-[#e1306c]" />}
      />
      <LinkedInUrlField
        startAdornment={<LinkedInIcon className="text-[#0a66c2]" />}
      />
      <YouTubeUrlField
        startAdornment={<YouTubeIcon className="text-[#ff0000]" />}
      />
    </section>
  );
}

type SocialField = ComponentType<{ startAdornment?: ReactNode }>;

type SocialFieldComponents = {
  facebookUrl: SocialField;
  instagramUrl: SocialField;
  linkedinUrl: SocialField;
  youtubeUrl: SocialField;
};
