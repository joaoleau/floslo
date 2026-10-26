import type { base as ptBase } from '../pt/base';
import type { Translation } from '../types';

// General texts, authentication, permissions, profile and onboarding, in English.
export const base: Translation<typeof ptBase> = {
  common: {
    ok: 'OK',
    cancel: 'Cancel',
    delete: 'Delete',
    save: 'Save',
    attention: 'Heads up',
    error: 'Error',
    success: 'Success',
    retry: 'Try again',
    loadFailed: "Couldn't load the data.",
    understood: 'Got it',
    selected_one: '{{count}} selected',
    selected_other: '{{count}} selected',
    crashed: 'Something went wrong. Close and reopen the app.',
  },
  errors: {
    network: "Can't reach the server. Check your connection and try again.",
    api: {
      invalidCredentials: 'Wrong username, email or password.',
      invalidCode: 'Invalid or expired code.',
      usernameTaken: 'That nickname is already taken.',
      usernameRequired: 'Enter a username.',
      emailRequired: 'Enter your email.',
      passwordRequired: 'Enter your password.',
      weakPassword: 'The password needs at least 8 characters, with at least 1 letter and 1 number.',
      currentPasswordRequired: 'Enter your current password to set a new one.',
      currentPasswordIncorrect: 'Your current password is incorrect.',
      documentNeedsTag: 'The document needs at least one tag.',
      noChallenge: "Couldn't create challenges for this alarm.",
      noChunks: "This scheduler's documents have no processed content yet.",
      noChallengeTypes: 'This scheduler has no challenge type set up.',
      weekdayRequired: 'Pick at least one day of the week.',
      documentRequired: 'Pick at least one document.',
      schedulerNameRequired: 'Give the scheduler a name.',
      startTimeRequired: 'Pick the alarm time.',
      objectNotFound: 'Document not found.',
      schedulerNotFound: 'Scheduler not found.',
    },
  },
  auth: {
    email: 'Email',
    password: 'Password',
    passwordRules: {
      minLength: 'At least 8 characters',
      hasLetter: 'At least 1 letter',
      hasNumber: 'At least 1 number',
    },
    weakPassword: {
      title: 'Weak password',
      message: 'Your password must meet the requirements listed below the field.',
      newMessage: 'Your new password must meet the requirements listed below the field.',
    },
    login: {
      usernameOrEmail: 'Username or email',
      forgotPassword: 'Forgot your password?',
      submit: 'Sign in',
      noAccount: "Don't have an account?",
      signUp: 'Sign up',
      fieldsRequired: 'Enter your username or email and your password.',
      failed: "Couldn't sign in. Try again.",
    },
    register: {
      title: 'Create account',
      username: 'Username',
      submit: 'Sign up',
      fieldsRequired: 'Fill in all the fields.',
      failed: "Couldn't create the account. The username or email may already be in use.",
    },
    forgot: {
      title: 'Reset password',
      instructions: 'Enter your email to receive a recovery code.',
      sendCode: 'Send code',
      emailRequired: 'Enter the email you signed up with.',
      failed: "Couldn't send the email.",
    },
    verify: {
      title: 'Verify code',
      instructions: 'Enter the {{length}}-digit code sent to <email>{{email}}</email>.',
      resend: "Didn't get it? Resend code",
      invalidTitle: 'Invalid code',
      invalid: 'Invalid or expired code. Try again.',
      resentTitle: 'Code resent',
      resent: 'We sent a new code to your email.',
      resendFailed: "Couldn't resend the code.",
    },
    newPassword: {
      title: 'New password',
      instructions: 'Choose a new password for your account.',
      newPassword: 'New password',
      confirm: 'Confirm new password',
      submit: 'Change password',
      fieldsRequired: 'Enter the new password and its confirmation.',
      mismatch: "The confirmation doesn't match the new password.",
      changed: 'Your password was changed.',
    },
  },
  permissions: {
    enableNow: 'Turn on now',
    exactAlarm: {
      title: 'Permission needed',
      description:
        'Without "Alarms & reminders" turned on, your schedulers may not ring on time. Turn on this permission for Floslo in the Android settings.',
    },
    fullScreen: {
      title: 'Full screen alarm',
      description:
        'Without "Full screen notifications" turned on, the alarm only shows up as a notification and the challenge screen does not open by itself while the phone is locked. Turn on this permission for Floslo in the Android settings.',
    },
  },
  profile: {
    title: 'Profile',
    loadFailed: "Couldn't load your profile.",
    usernameRequired: "The nickname can't be blank.",
    usernameFailed: "Couldn't save. The nickname may already be taken.",
    logout: 'Sign out',
    password: {
      title: 'Change password',
      current: 'Current password',
      submit: 'Confirm change',
      fieldsRequired: 'Enter your current password, the new password and its confirmation.',
      failed: "Couldn't change the password.",
    },
    theme: {
      title: 'Appearance',
      light: 'Light',
      dark: 'Dark',
      system: 'Automatic',
    },
    language: {
      title: 'App language',
      pt: 'Português',
      en: 'English',
      system: 'Automatic',
      hint: 'Changes the app texts. The challenge language is chosen in each scheduler.',
    },
    deleteAccount: {
      title: 'Delete account',
      confirm: 'Are you sure you want to delete your account? This cannot be undone.',
      failed: "Couldn't delete the account.",
    },
  },
  onboarding: {
    skip: 'Skip',
    next: 'Next',
    start: 'Get started',
    materials: {
      title: 'Upload your materials',
      description:
        'In the Objects tab, upload your PDF documents. The app reads the content and finds the main subjects of each one, the tags, which you can review and adjust.',
    },
    scheduler: {
      title: 'Create a scheduler',
      description:
        'Choose the time, the days of the week and the study documents. When the alarm rings, it only stops after you answer all the challenges.',
    },
    challenges: {
      title: 'Choose the challenges',
      description:
        'In each scheduler, set how many Discovery, Multiple choice and True or False items each alarm brings, up to 10 in total, and the language they are written in.',
    },
    alarm: {
      title: 'Let the alarm ring',
      description:
        'Turn on the alarm and full screen notification permissions, so the alarm rings on time and opens by itself while the phone is locked. The home screen warns you when one is missing.',
    },
    streak: {
      title: 'Keep your streak',
      description:
        'Every study day counts toward your streak. In History you see your performance by subject, recent mistakes and the sessions you have answered.',
    },
  },
};
