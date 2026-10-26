package service

import "testing"

func TestValidateTermsAcceptance(t *testing.T) {
	if err := ValidateTermsAcceptance(TermsVersion); err != nil {
		t.Errorf("current version should be accepted, got %v", err)
	}
	for _, version := range []string{"", "2000-01-01"} {
		if err := ValidateTermsAcceptance(version); err == nil {
			t.Errorf("version %q should be rejected", version)
		}
	}
}

func TestValidatePasswordStrength(t *testing.T) {
	tests := []struct {
		name     string
		password string
		wantErr  bool
	}{
		{name: "valid: letters and numbers, 8 chars", password: "abcd1234", wantErr: false},
		{name: "valid: longer with mixed case", password: "MySecret123", wantErr: false},
		{name: "too short", password: "abc123", wantErr: true},
		{name: "only letters, no number", password: "abcdefgh", wantErr: true},
		{name: "only numbers, no letter", password: "12345678", wantErr: true},
		{name: "empty", password: "", wantErr: true},
		{name: "exactly 8 chars, valid mix", password: "a1234567", wantErr: false},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			err := ValidatePasswordStrength(tt.password)
			if (err != nil) != tt.wantErr {
				t.Errorf("ValidatePasswordStrength(%q) error = %v, wantErr %v", tt.password, err, tt.wantErr)
			}
		})
	}
}
