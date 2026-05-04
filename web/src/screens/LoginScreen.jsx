import React, { memo } from "react";
import Button from "../components/Button";
import HeroIllustration from "../components/HeroIllustration";
import { useApp } from "../context/AppContext";

function LoginScreen() {
  const { navigate } = useApp();

  return (
    <section className="screen login" aria-label="Sign in">
      <div className="logo-wrap"></div>

      <div className="wordmark">HESSA SEARCH</div>
      <div className="sub">find real moments in existing video</div>

      <div className="hero" aria-hidden="true">
        <HeroIllustration />
      </div>

      <div className="actions">
        <Button variant="ghost" icon="mail">
          Sign in with Email
        </Button>

        <Button variant="ghost" icon="phone">
          Sign in with Phone Number
        </Button>

        <div className="or">or</div>

        <Button variant="ghost" onClick={() => navigate("advancedPlans")}>
          Advanced Pro
        </Button>

        <Button variant="ghost" onClick={() => navigate("privacyPlans")}>
          Privacy Check
        </Button>
      </div>

      <div className="terms">
        By continuing, you agree to our
        <br />
        Terms of Use &amp; Privacy Policy
      </div>
    </section>
  );
}

export default memo(LoginScreen);