package plugins

import (
	"context"
	"encoding/json"
	"fmt"

	"github.com/grafana/grafana-plugin-sdk-go/backend"
	"github.com/grafana/grafana/pkg/infra/log"
	"github.com/grafana/grafana/pkg/models"
	"github.com/grafana/grafana/pkg/plugins/backendplugin"
	"github.com/grafana/grafana/pkg/plugins/backendplugin/pluginextensionv2"
)

type Plugin struct {
	JSONData

	PluginDir string
	Class     PluginClass

	// App fields
	IncludedInAppID string
	DefaultNavURL   string
	Pinned          bool

	// Signature fields
	Signature      SignatureStatus
	SignatureType  SignatureType
	SignatureOrg   string
	Parent         *Plugin
	Children       []*Plugin
	SignedFiles    PluginFiles
	SignatureError *PluginSignatureError

	// GCOM update checker fields
	GrafanaComVersion   string
	GrafanaComHasUpdate bool

	// SystemJS fields
	Module  string
	BaseURL string

	Renderer pluginextensionv2.RendererPlugin
	client   backendplugin.Plugin
	log      log.Logger
}

// JSONData represents the plugin's plugin.json
type JSONData struct {
	// Common settings
	ID           string             `json:"id"`
	Type         PluginType         `json:"type"`
	Name         string             `json:"name"`
	Info         PluginInfo         `json:"info"`
	Dependencies PluginDependencies `json:"dependencies"`
	Includes     []*PluginInclude   `json:"includes"`
	State        State              `json:"state,omitempty"`
	Category     string             `json:"category"`
	HideFromList bool               `json:"hideFromList,omitempty"`
	Preload      bool               `json:"preload"`
	Backend      bool               `json:"backend"`

	// Panel settings
	SkipDataQuery bool `json:"skipDataQuery"`

	// App settings
	AutoEnabled bool `json:"autoEnabled"`

	// Datasource settings
	Annotations  bool            `json:"annotations"`
	Metrics      bool            `json:"metrics"`
	Alerting     bool            `json:"alerting"`
	Explore      bool            `json:"explore"`
	Table        bool            `json:"tables"`
	Logs         bool            `json:"logs"`
	Tracing      bool            `json:"tracing"`
	QueryOptions map[string]bool `json:"queryOptions,omitempty"`
	BuiltIn      bool            `json:"builtIn,omitempty"`
	Mixed        bool            `json:"mixed,omitempty"`
	Streaming    bool            `json:"streaming"`
	SDK          bool            `json:"sdk,omitempty"`

	// Backend (App + Datasource + Renderer settings)
	Routes     []*Route `json:"routes"`
	Executable string   `json:"executable,omitempty"`
}

// Route describes a plugin route that is defined in
// the plugin.json file for a plugin.
type Route struct {
	Path         string          `json:"path"`
	Method       string          `json:"method"`
	ReqRole      models.RoleType `json:"reqRole"`
	URL          string          `json:"url"`
	URLParams    []URLParam      `json:"urlParams"`
	Headers      []Header        `json:"headers"`
	AuthType     string          `json:"authType"`
	TokenAuth    *JWTTokenAuth   `json:"tokenAuth"`
	JwtTokenAuth *JWTTokenAuth   `json:"jwtTokenAuth"`
	Body         json.RawMessage `json:"body"`
}

// Header describes an HTTP header that is forwarded with
// the proxied request for a plugin route
type Header struct {
	Name    string `json:"name"`
	Content string `json:"content"`
}

// URLParam describes query string parameters for
// a url in a plugin route
type URLParam struct {
	Name    string `json:"name"`
	Content string `json:"content"`
}

// JWTTokenAuth struct is both for normal Token Auth and JWT Token Auth with
// an uploaded JWT file.
type JWTTokenAuth struct {
	Url    string            `json:"url"`
	Scopes []string          `json:"scopes"`
	Params map[string]string `json:"params"`
}

func (p *Plugin) PluginID() string {
	return p.ID
}

func (p *Plugin) Logger() log.Logger {
	return p.log
}

func (p *Plugin) SetLogger(l log.Logger) {
	p.log = l
}

func (p *Plugin) Start(ctx context.Context) error {
	if p.client == nil {
		return fmt.Errorf("could not start plugin %s as no plugin client exists", p.ID)
	}

	err := p.client.Start(ctx)
	if err != nil {
		return err
	}

	return nil
}

func (p *Plugin) Stop(ctx context.Context) error {
	if p.client == nil {
		return nil
	}
	err := p.client.Stop(ctx)
	if err != nil {
		return err
	}

	return nil
}

func (p *Plugin) IsManaged() bool {
	if p.client != nil {
		return p.client.IsManaged()
	}
	return false
}

func (p *Plugin) Decommission() error {
	if p.client != nil {
		return p.client.Decommission()
	}
	return nil
}

func (p *Plugin) IsDecommissioned() bool {
	if p.client != nil {
		return p.client.IsDecommissioned()
	}
	return false
}

func (p *Plugin) Exited() bool {
	if p.client != nil {
		return p.client.Exited()
	}
	return false
}

func (p *Plugin) QueryData(ctx context.Context, req *backend.QueryDataRequest) (*backend.QueryDataResponse, error) {
	pluginClient, ok := p.Client()
	if !ok {
		return nil, backendplugin.ErrPluginUnavailable
	}
	return pluginClient.QueryData(ctx, req)
}

func (p *Plugin) CallResource(ctx context.Context, req *backend.CallResourceRequest, sender backend.CallResourceResponseSender) error {
	pluginClient, ok := p.Client()
	if !ok {
		return backendplugin.ErrPluginUnavailable
	}
	return pluginClient.CallResource(ctx, req, sender)
}

func (p *Plugin) CheckHealth(ctx context.Context, req *backend.CheckHealthRequest) (*backend.CheckHealthResult, error) {
	pluginClient, ok := p.Client()
	if !ok {
		return nil, backendplugin.ErrPluginUnavailable
	}
	return pluginClient.CheckHealth(ctx, req)
}

func (p *Plugin) CollectMetrics(ctx context.Context) (*backend.CollectMetricsResult, error) {
	pluginClient, ok := p.Client()
	if !ok {
		return nil, backendplugin.ErrPluginUnavailable
	}
	return pluginClient.CollectMetrics(ctx)
}

func (p *Plugin) SubscribeStream(ctx context.Context, req *backend.SubscribeStreamRequest) (*backend.SubscribeStreamResponse, error) {
	pluginClient, ok := p.Client()
	if !ok {
		return nil, backendplugin.ErrPluginUnavailable
	}
	return pluginClient.SubscribeStream(ctx, req)
}

func (p *Plugin) PublishStream(ctx context.Context, req *backend.PublishStreamRequest) (*backend.PublishStreamResponse, error) {
	pluginClient, ok := p.Client()
	if !ok {
		return nil, backendplugin.ErrPluginUnavailable
	}
	return pluginClient.PublishStream(ctx, req)
}

func (p *Plugin) RunStream(ctx context.Context, req *backend.RunStreamRequest, sender *backend.StreamSender) error {
	pluginClient, ok := p.Client()
	if !ok {
		return backendplugin.ErrPluginUnavailable
	}
	return pluginClient.RunStream(ctx, req, sender)
}

func (p *Plugin) RegisterClient(c backendplugin.Plugin) {
	p.client = c
}

func (p *Plugin) Client() (PluginClient, bool) {
	if p.client != nil {
		return p.client, true
	}
	return nil, false
}

func (p *Plugin) StaticRoute() *PluginStaticRoute {
	return &PluginStaticRoute{Directory: p.PluginDir, PluginID: p.ID}
}

func (p *Plugin) IsRenderer() bool {
	return p.Type == "renderer"
}

func (p *Plugin) IsDataSource() bool {
	return p.Type == "datasource"
}

func (p *Plugin) IsPanel() bool {
	return p.Type == "panel"
}

func (p *Plugin) IsApp() bool {
	return p.Type == "app"
}

func (p *Plugin) IsCorePlugin() bool {
	return p.Class == Core
}

func (p *Plugin) IsBundledPlugin() bool {
	return p.Class == Bundled
}

func (p *Plugin) IsExternalPlugin() bool {
	return p.Class == External
}

func (p *Plugin) SupportsStreaming() bool {
	pluginClient, ok := p.Client()
	if !ok {
		return false
	}

	_, ok = pluginClient.(backend.StreamHandler)
	return ok
}

func (p *Plugin) IncludedInSignature(file string) bool {
	// permit Core plugin files
	if p.IsCorePlugin() {
		return true
	}

	// permit when no signed files (no MANIFEST)
	if p.SignedFiles == nil {
		return true
	}

	if _, exists := p.SignedFiles[file]; !exists {
		return false
	}
	return true
}

type PluginClient interface {
	backend.QueryDataHandler
	backend.CollectMetricsHandler
	backend.CheckHealthHandler
	backend.CallResourceHandler
	backend.StreamHandler
}

type PluginClass string

const (
	Core     PluginClass = "core"
	Bundled  PluginClass = "bundled"
	External PluginClass = "external"
	Unknown  PluginClass = "unknown"
)

var PluginTypes = []PluginType{
	DataSource,
	Panel,
	App,
	Renderer,
}

type PluginType string

const (
	DataSource PluginType = "datasource"
	Panel      PluginType = "panel"
	App        PluginType = "app"
	Renderer   PluginType = "renderer"
)

func (pt PluginType) IsValid() bool {
	switch pt {
	case DataSource, Panel, App, Renderer:
		return true
	}
	return false
}
