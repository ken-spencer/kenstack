import {
  Body,
  Button,
  //  Column,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  //  Img,
  //  Link,
  //  Preview,
  //  Row,
  Section,
  Tailwind,
  Text,
} from "@react-email/components";
import * as React from "react";

/*
const baseUrl = process.env.VERCEL_URL
  ? `https://${process.env.VERCEL_URL}`
  : '';
*/

export default function ForgottenPasswordEmail({
  name = "Your name",
  url = null,
  country = null,
  city = null,
  region = null,
  ip = "204.13.186.218",
}) {
  let location = city;

  if (region) {
    location += (location ? ", " : "") + region;
  }

  if (country) {
    location += (location ? " " : "") + country;
  }

  return (
    <Html>
      <Head />
      <Tailwind>
        <Body className="bg-white my-auto mx-auto font-sans">
          <Container className="border border-solid border-[#eaeaea] rounded my-[40px] mx-auto p-[20px] w-[465px]">
            {/*
            <Section className="mt-[32px]">
              <Img
                src={`${baseUrl}/static/vercel-logo.png`}
                width="40"
                height="37"
                alt="Vercel"
                className="my-0 mx-auto"
              />
            </Section>
          */}
            <Heading className="text-black text-[24px] font-normal text-center p-0 my-[30px] mx-0">
              Reset your password
            </Heading>
            <Text className="text-black text-[14px] leading-[24px]">
              Hello {name},
            </Text>
            <Text className="text-black text-[14px] leading-[24px]">
              We received a request to reset the password for your account
              associated with this email address. If you made this request,
              please click on the link below to reset your password:
            </Text>
            <Section className="text-center mt-[32px] mb-[32px]">
              <Button
                style={{ padding: "10px 20px" }}
                className="bg-blue-700 rounded text-white text-[14px] font-bold no-underline text-center"
                href={url}
              >
                Reset your password
              </Button>
            </Section>
            <Text className="text-black text-[14px] leading-[24px]">
              This link will remain active for 15 minutes.
            </Text>
            <Hr className="border border-solid border-[#eaeaea] my-[26px] mx-0 w-full" />
            <Text className="text-[#666666] text-[12px] leading-[24px]">
              This email was intended for{" "}
              <span className="text-black">{name} </span>. It was requested from{" "}
              <span className="text-black">{ip}</span>
              {location && (
                <>
                  located in <span className="text-black">{location}</span>
                </>
              )}
              . If you were not expecting this email, you can ignore it. If you
              are concerned about your account{"'"}s safety, please reply to
              this email to get in touch with us.
            </Text>
          </Container>
        </Body>
      </Tailwind>
    </Html>
  );
}
