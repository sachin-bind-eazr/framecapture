import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Terms & Conditions | Share the Joy",
  description: "Terms and conditions for the Joy of Giving event photo booth.",
};

export default function TermsPage() {
  return (
    <main className="terms-shell">
      <article className="terms-card">
        <Link className="terms-back" href="/" aria-label="Back to the photo booth">
          <span aria-hidden="true">&larr;</span> Back to photo booth
        </Link>

        <h1 className="terms-heading">Terms &amp;<br/><em>Conditions</em></h1>
        <p className="terms-updated">Effective 21 September 2026</p>

        <div className="terms-content">
          <section>
            <h2>1. About this photo booth</h2>
            <p>This event photo booth is provided for Joy of Giving Week by Witty International School and The Good Box Charitable Trust. By using it, you agree to these terms.</p>
          </section>

          <section>
            <h2>2. Camera access and your photos</h2>
            <p>Camera access is used only to capture your photo. Photos you capture or select are processed on your device and can be saved in this browser. The booth can store up to 10 photos. You can delete them from the gallery at any time or remove them by clearing this site&apos;s browser data.</p>
          </section>

          <section>
            <h2>3. Sharing</h2>
            <p>Your photo is shared only when you choose a share or download action. Any social platform you use has its own terms and privacy practices. Please review them before posting.</p>
          </section>

          <section>
            <h2>4. Your responsibility</h2>
            <p>Only capture or share photos when you have permission from everyone shown. Do not use the booth for unlawful, harmful, misleading, or offensive content, or in a way that infringes another person&apos;s rights.</p>
          </section>

          <section>
            <h2>5. Availability</h2>
            <p>The booth is provided for the event and may be changed, suspended, or removed. While reasonable care is taken to keep it working, uninterrupted availability cannot be guaranteed.</p>
          </section>

          <section>
            <h2>6. Questions</h2>
            <p>For questions about the event or these terms, contact <a href="https://www.instagram.com/thegoodboxproject" target="_blank" rel="noreferrer">@thegoodboxproject</a> or <a href="https://www.instagram.com/wittyinternationalschool" target="_blank" rel="noreferrer">@wittyinternationalschool</a>.</p>
          </section>
        </div>
      </article>
    </main>
  );
}
