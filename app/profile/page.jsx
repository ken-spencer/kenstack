import ProfileForm from "@thaumazo/cms/components/ProfileForm";

// import styles from "./page.module.css"
import { Main } from "@thaumazo/cms/components";

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
