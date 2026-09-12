"use client";

import type { ComponentType, ReactNode } from "react";

import Section from "@kenstack/admin/Edit/Section";
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
    <Section title="Social media">
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
    </Section>
  );
}

type SocialField = ComponentType<{ startAdornment?: ReactNode }>;

type SocialFieldComponents = {
  facebookUrl: SocialField;
  instagramUrl: SocialField;
  linkedinUrl: SocialField;
  youtubeUrl: SocialField;
};
