package service

import "testing"

func TestNextStreak(t *testing.T) {
	tests := []struct {
		name           string
		currentStreak  int
		lastActiveDate string
		localDate      string
		want           int
	}{
		{name: "first ever answer", currentStreak: 0, lastActiveDate: "", localDate: "2026-01-10", want: 1},
		{name: "consecutive day extends the streak", currentStreak: 4, lastActiveDate: "2026-01-09", localDate: "2026-01-10", want: 5},
		{name: "same day reported twice is a no-op", currentStreak: 4, lastActiveDate: "2026-01-10", localDate: "2026-01-10", want: 4},
		{name: "gap of more than one day resets to 1", currentStreak: 12, lastActiveDate: "2026-01-05", localDate: "2026-01-10", want: 1},
		{
			name:           "an earlier date than the last active one (e.g. another device's timezone) does not regress",
			currentStreak:  6,
			lastActiveDate: "2026-01-10",
			localDate:      "2026-01-09",
			want:           6,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := nextStreak(tt.currentStreak, tt.lastActiveDate, tt.localDate)
			if got != tt.want {
				t.Errorf("nextStreak(%d, %q, %q) = %d, want %d", tt.currentStreak, tt.lastActiveDate, tt.localDate, got, tt.want)
			}
		})
	}
}
