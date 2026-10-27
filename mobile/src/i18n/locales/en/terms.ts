import type { terms as ptTerms } from '../pt/terms';
import type { Translation } from '../types';

// Terms of use and Privacy policy, in English.
export const terms: Translation<typeof ptTerms> = {
  terms: {
    title: 'Terms and privacy',
    heading: 'Terms of use and Privacy policy',
    updatedAt: 'Version of {{version}}',
    acceptBefore: 'I have read and accept the ',
    acceptLink: 'Terms of use and the Privacy policy',
    acceptAfter: ', including storing my data in the United States.',
    acceptRequired: 'To create the account, read and accept the Terms of use and the Privacy policy.',
    aiNotice: 'AI generated from your material. It may contain mistakes.',
    sections: {
      about: {
        title: '1. About Floslo',
        body: 'Floslo is a study app that turns the materials you upload into alarm challenges. It is an academic prototype, developed as an undergraduate final project, and is offered with no availability guarantee: it may go offline, change or be shut down.\n\nThe person responsible for processing your data (controller) is João Vitor Leal de Castro. For any question or request about your data, write to joaoo.lealc@gmail.com.',
      },
      data: {
        title: '2. Data we collect',
        body: 'Account: email, username and password. The password is never stored as typed, only in encrypted form (hash).\n\nMaterials: the PDF documents you upload, the text extracted from them and the tags of each one.\n\nUsage: the schedulers you create, your study streak and the date you accepted these terms.\n\nYour answer history (right answers, mistakes and sessions) is stored only on your phone, not on our servers.',
      },
      purpose: {
        title: '3. How we use the data',
        body: 'We use the data only to make the app work: create and keep your account, process your materials, create the challenges of each alarm, count your streak and email the password recovery code. We do not sell your data, use it for advertising or share it with third parties beyond the infrastructure services described below.\n\nThe processing is based on providing the service you signed up for and on your consent, given when you accept these terms (Brazilian General Data Protection Law, LGPD, Law 13,709/2018).',
      },
      storage: {
        title: '4. Where the data is stored',
        body: 'All data sent to Floslo is stored on Amazon Web Services (AWS), in the us-east-1 region, in Virginia, United States. This includes the account, the documents, the extracted text and the generated challenges. The challenges are generated with Amazon Bedrock, in the same region, and AWS does not use this content to train AI models.\n\nSince the data leaves Brazil, this is an international data transfer. By accepting these terms, you specifically consent to this transfer (LGPD, art. 33, VIII).',
      },
      ai: {
        title: '5. AI generated content',
        body: 'The questions, statements, explanations and discoveries are generated automatically by an artificial intelligence model from your materials. This content may contain mistakes, inaccuracies or information that is not in the material (so called hallucinations).\n\nUse the challenges as study support, not as a definitive source. When in doubt, check the source excerpt in "Based on" and the original material. Floslo does not replace your study material, a teacher or professional advice.',
      },
      copyright: {
        title: '6. Your materials and copyright',
        body: 'You remain the owner of the materials you upload and you are responsible for having the right to use them. Upload only content you may use for personal study, respecting the copyright of others.\n\nThe materials and the challenges created from them are used only in your account, for your study, and are not published or shared with other users.',
      },
      rights: {
        title: '7. Your rights',
        body: 'Under the LGPD, you may ask for confirmation that we process your data, access to it, correction of incomplete or wrong data, deletion of the data and information about who it is shared with, and you may withdraw your consent.\n\nYou can delete your account at any time in Profile > Delete account. This deletes the account, the documents, the extracted text and the schedulers from our servers. The history stored on the phone is deleted when you uninstall the app or clear its data. For any other request, write to joaoo.lealc@gmail.com.',
      },
      security: {
        title: '8. Security',
        body: 'The communication between the app and the servers is encrypted (HTTPS), the password is stored only in encrypted form and each account accesses only its own data. No system is completely immune to failures; if a security incident affects your data, you will be notified.',
      },
      changes: {
        title: '9. Changes to these terms',
        body: 'These terms may be updated. When that happens, the new version will be shown in the app, with the version date.',
      },
    },
  },
};
