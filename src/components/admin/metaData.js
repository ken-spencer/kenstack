import verifyJWT from "@thaumazo/cms/auth/verifyJWT";

export async function generateMetadata({ params }) {
  const adminParams = params.admin || [];

  if (adminParams.length > 2) {
    return { title: "Error" };
  }

  let [segment = null, id = null] = adminParams;

  const prefix = "Admin | ";
  switch (segment) {
    case "login":
      return { title: prefix + "Login" };
    case "forgotten-password":
      return { title: prefix + "Forgotten password" };
  }

  if (segment && (segment === "new" || segment.match(/^[0-9a-fA-F]{24}$/))) {
    id = segment;

    segment = null;
  }

  const claims = await verifyJWT("ADMIN");
  if (!claims) {
    return { title: prefix + "Login" };
  }

  switch (segment) {
    case "reset-password":
      return { title: prefix + "Reset password" };
  }

  const admin = thaumazoAdmin.navigation.get(segment);
  if (!admin) {
    return {};
  }

  if (id) {
    return {
      title: prefix + admin.title + " : " + (id === "new" ? "New" : "Edit"),
    };
  } else {
    return { title: prefix + admin.title };
  }
}
