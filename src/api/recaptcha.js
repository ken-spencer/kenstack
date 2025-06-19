const recaptcha =
  ({ field = "recaptchaToken" } = {}) =>
  async ({ data }) => {
    const secretKey = process.env.RECAPTCHA_SECRET_KEY;

    if (!secretKey) {
      throw Error("RECAPTCHA_SECRET_KEY environment variable is not set");
    }

    const token = data[field];
    if (!token) {
      return Response.json({
        error: `Recaptcha token field ${field} is required`,
      });
    }

    delete data[field];

    const verificationRes = await fetch(
      "https://www.google.com/recaptcha/api/siteverify",
      {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: `secret=${secretKey}&response=${token}`,
      },
    );

    if (!verificationRes.ok) {
      return { error: "Problem connecting to Recaptcha" };
    }

    const verification = await verificationRes.json();
    if (!verification.success || verification.score < 0.5) {
      // eslint-disable-next-line no-console
      console.log("Contact captcha failed with: ", verification, data);
      return Response.json({ error: "Couldn’t verify you’re human. Please try again." });
    }
  };

export default recaptcha;
