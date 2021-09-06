package flux

import (
	"testing"
	"time"

	"github.com/google/go-cmp/cmp"
	"github.com/grafana/grafana-plugin-sdk-go/backend"
	"github.com/stretchr/testify/assert"
)

func TestInterpolate(t *testing.T) {
	// Unix sec: 1500376552
	// Unix ms:  1500376552001

	timeRange := backend.TimeRange{
		From: time.Unix(0, 0),
		To:   time.Unix(0, 0),
	}

	options := queryOptions{
		Organization:  "grafana1",
		Bucket:        "grafana2",
		DefaultBucket: "grafana3",
	}

	tests := []struct {
		name   string
		before string
		after  string
	}{
		{
			name:   "interpolate flux variables",
			before: `v.timeRangeStart, something.timeRangeStop, XYZ.bucket, uuUUu.defaultBucket, aBcDefG.organization, window.windowPeriod, a91{}.bucket, $__interval, $__interval_ms`,
			after:  `1970-01-01T00:00:00Z, 1970-01-01T00:00:00Z, "grafana2", "grafana3", "grafana1", 1s, a91{}.bucket, 1s, 1000`,
		},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			query := queryModel{
				RawQuery:      tt.before,
				Options:       options,
				TimeRange:     timeRange,
				MaxDataPoints: 1,
				Interval:      1000 * 1000 * 1000,
			}
			interpolatedQuery := interpolate(query)
			diff := cmp.Diff(tt.after, interpolatedQuery)
			assert.Equal(t, "", diff)
		})
	}
}
