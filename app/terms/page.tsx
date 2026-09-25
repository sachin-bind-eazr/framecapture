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
        <p className="terms-updated">Effective Date: 21 September 2026</p>

        <div className="terms-content">
          <section>
            <h2>1. About this photo booth</h2>
            <p>Welcome to the Joy of Giving Week Photo Booth, a collaborative initiative by Witty Kids Borivali (&ldquo;Witty&rdquo;) and The Good Box Charitable Trust (&ldquo;TGB&rdquo;).</p>
            <p>By accessing, using or submitting a photograph through witty.thegoodboxproject.org, you acknowledge and agree to the following terms.</p>
            <p>The Photo Booth has been created as part of Joy of Giving Week to encourage students, parents, teachers and members of the school community to participate, spread awareness and celebrate the spirit of giving.</p>
          </section>

          <section>
            <h2>2. Permission and consent</h2>
            <p>By choosing to capture, upload or submit a photograph through the Photo Booth, you confirm that:</p>
            <ul>
              <li>You have the right and necessary permission to submit and share the photograph.</li>
              <li>Everyone identifiable in the photograph has given permission for the photograph to be captured and used for the purposes described below.</li>
              <li>Where the photograph includes a child/minor, the submission is made with the knowledge and consent of the child&apos;s parent or lawful guardian.</li>
              <li>You understand that photographs may contain identifiable individuals and therefore may constitute personal data.</li>
            </ul>
          </section>

          <section>
            <h2>3. Use of photographs</h2>
            <p>By submitting a photograph, you grant Witty Kids Borivali and The Good Box Charitable Trust a non-exclusive, royalty-free permission to use the submitted photograph for the following purposes:</p>
            <ul>
              <li>Joy of Giving Week communication and awareness.</li>
              <li>Posts, stories, reels and other content on official social media accounts.</li>
              <li>Websites and digital platforms operated by Witty Kids Borivali and/or TGB.</li>
              <li>Event presentations, displays, photo galleries and campaign materials.</li>
              <li>Reports, newsletters and documentation relating to the initiative.</li>
              <li>Future editions or related activities of Joy of Giving and other social-impact initiatives conducted by Witty and/or TGB.</li>
            </ul>
            <p>Photographs may be cropped, resized, edited, combined with graphics, captions, campaign branding or other creative elements for the above purposes, while reasonable care will be taken to preserve the context and dignity of the participants.</p>
          </section>

          <section>
            <h2>4. Non-commercial use</h2>
            <p>Photographs submitted through this Photo Booth will not be sold, licensed or commercially traded as standalone photographs.</p>
            <p>The photographs will be used for awareness, documentation, communication, celebration and social-impact purposes connected with Witty Kids Borivali, The Good Box Charitable Trust and their related initiatives.</p>
            <p>No participant will be entitled to monetary compensation, royalty or payment for such use.</p>
          </section>

          <section>
            <h2>5. Sharing</h2>
            <p>Participants may choose to download or share their photographs on their own social media accounts.</p>
            <p>If a participant chooses to share a photograph independently, that sharing is subject to the privacy policies and terms of the relevant social media platform.</p>
            <p>Witty and TGB may also repost or use photographs submitted through the Photo Booth on their official channels in accordance with these Terms.</p>
          </section>

          <section>
            <h2>6. Children and minors</h2>
            <p>For photographs featuring children below 18 years of age, the parent or lawful guardian is responsible for providing the required consent for the photograph to be submitted and used in accordance with these Terms.</p>
            <p>Parents or guardians should not submit photographs of another child unless they have the appropriate permission to do so.</p>
          </section>

          <section>
            <h2>7. Privacy and security</h2>
            <p>Only information reasonably required for operating the Photo Booth and managing the submitted content will be collected.</p>
            <p>Photographs and related information will be handled with reasonable security measures and used for the purposes described in these Terms.</p>
            <p>Witty and TGB will not knowingly use submitted photographs for unrelated advertising, targeted advertising or unrelated commercial purposes.</p>
          </section>

          <section>
            <h2>8. Requests to stop future use</h2>
            <p>If you are a participant, parent or lawful guardian and wish to request removal of a photograph from future use, you may contact us using the details below.</p>
            <p>Upon receiving a valid request, reasonable steps will be taken to stop future use of the photograph where practicable.</p>
            <p>Please note that content may already have been published, shared, downloaded, reproduced or archived by third parties, including social media platforms, and complete removal from third-party platforms may not always be possible.</p>
          </section>

          <section>
            <h2>9. Acceptable submissions</h2>
            <p>Participants must not submit photographs that:</p>
            <ul>
              <li>Include people without appropriate permission.</li>
              <li>Contain unlawful, abusive, discriminatory, threatening or offensive material.</li>
              <li>Infringe another person&apos;s privacy, copyright, trademark or other rights.</li>
              <li>Misrepresent or impersonate another person.</li>
              <li>Are submitted for any purpose unrelated to the Joy of Giving initiative.</li>
            </ul>
            <p>Witty and TGB reserve the right to decline, remove or not publish any photograph that they consider inappropriate or inconsistent with the purpose of the initiative.</p>
          </section>

          <section>
            <h2>10. Publication and selection</h2>
            <p>Submission of a photograph does not guarantee that it will be published or used.</p>
            <p>Witty and TGB may select photographs at their discretion based on campaign requirements, suitability, quality, space and other practical considerations.</p>
          </section>

          <section>
            <h2>11. Availability</h2>
            <p>The Photo Booth is provided as part of the Joy of Giving Week initiative. It may be modified, temporarily suspended or discontinued without prior notice.</p>
            <p>While reasonable efforts will be made to maintain its availability, uninterrupted or error-free operation cannot be guaranteed.</p>
          </section>

          <section>
            <h2>12. Updates to these terms</h2>
            <p>Witty and TGB may update these Terms from time to time to reflect changes to the initiative, technology or applicable requirements.</p>
            <p>The latest version published on the Photo Booth portal will apply to future submissions.</p>
          </section>

          <section>
            <h2>13. Contact</h2>
            <p>For questions, consent-related requests or requests concerning the use of photographs, please contact:</p>
            <p>The Good Box Charitable Trust<br/>Instagram: <a href="https://www.instagram.com/thegoodboxproject" target="_blank" rel="noreferrer">@thegoodboxproject</a></p>
            <p>Witty Kids Borivali<br/>Instagram: <a href="https://www.instagram.com/wittyinternationalschool" target="_blank" rel="noreferrer">@wittyinternationalschool</a></p>
          </section>

          <section>
            <h2>Celebrating the joy of giving</h2>
            <p>The Joy of Giving is about celebrating kindness, participation and community.</p>
            <p>We will use submitted photographs to spread awareness, celebrate participation and document the impact of the initiative &mdash; never to sell your photographs.</p>
          </section>
        </div>
      </article>
    </main>
  );
}
