import ProfileForm from "@admin/components/ProfileForm";

// import styles from "./page.module.css"
import { Main } from "@admin/components";

export default function Profile() {
  return (
    <Main>
      <ProfileForm />
    </Main>
  );
}

export const metadata = {
  title: "Login",
};
