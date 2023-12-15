//go:build js && wasm

package main

import (
	"errors"
	"github.com/antlr/antlr4/runtime/Go/antlr"
	"log/slog"
	"syscall/js"

	//"syscall/js"
	"xiomi.org/antlr-log-parser/parser"
)

type Err struct {
	Error string
}

func (e Err) AsMap() map[string]interface{} {
	return map[string]interface{}{
		"Error": e.Error,
	}
}

//func main() {
//	tree := RunAntlr("PagerDutyEventWrapper{id=01ECMXFZFNLKOI5C1RH4Z2HP3X, eventType=TRIGGERED, resourceType=incident, agent=EntityReference{id=PO0A0UW, type=inbound_integration_reference, summary=kepler, self=https://api.pagerduty.com/services/PLHVP4R/integrations/PO0A0UW, htmlUrl=https://hubspot.pagerduty.com/services/PLHVP4R/integrations/PO0A0UW}, client={}, incident=PagerDutyIncidentV3{id=Q3NB2THXBEIF8R, type=incident, self=https://api.pagerduty.com/incidents/Q3NB2THXBEIF8R, htmlUrl=https://hubspot.pagerduty.com/incidents/Q3NB2THXBEIF8R, number=19982890, status=triggered, title=prod/na1 [high priority]: kepler-AT-T11-15129dbf alerting because kepler.acceptance_test.T11.metric.15129dbf is < 5.00 for 1m.\n\nRule generated by AT, service=EntityReference{id=PLHVP4R, type=service_reference, summary=Monitoring Test Service, self=https://api.pagerduty.com/services/PLHVP4R, htmlUrl=https://hubspot.pagerduty.com/services/PLHVP4R}, assignees=[EntityReference{id=P7G50UR, type=user_reference, summary=Kepler, self=https://api.pagerduty.com/users/P7G50UR, htmlUrl=https://hubspot.pagerduty.com/users/P7G50UR}], escalationPolicy=EntityReference{id=PL44YCE, type=escalation_policy_reference, summary=PagerDuty Auditor, self=https://api.pagerduty.com/escalation_policies/PL44YCE, htmlUrl=https://hubspot.pagerduty.com/escalation_policies/PL44YCE}, teams=[EntityReference{id=POZ1JD4, type=team_reference, summary=Paas Monitoring Test Team, self=https://api.pagerduty.com/teams/POZ1JD4, htmlUrl=https://hubspot.pagerduty.com/teams/POZ1JD4}], urgency=high, createdAtRaw=2023-12-12T00:00:59Z, createdAt=2023-12-12T00:00:59Z}, occurredAtRaw=2023-12-12T00:00:59.491Z, occurredAt=2023-12-12T00:00:59.491Z}")
//	spew.Dump(tree.GetRuleIndex())
//	if logs, ok := tree.(*parser.LogsContext); ok {
//		spew.Dump(HandleLogs(*logs))
//	} else {
//		panic("Invalid tree")
//	}
//}

func IsString(v interface{}) (*string, bool) {
	if s, ok := v.(*antlr.TerminalNodeImpl); ok {
		if s.GetSymbol().GetTokenType() != parser.LogParserLexerSTRING {
			return nil, false
		}

		id := s.GetText()
		return &id, true
	}

	return nil, false
}

func HandleLogs(logs parser.LogsContext) (*Class, error) {
	if logs.GetChildCount() != 2 {
		return nil, errors.New("invalid children, expected class then terminal")
	}

	if class, ok := logs.GetChild(0).(*parser.ClassContext); ok {
		return HandleClass(*class)
	}

	return nil, errors.New("invalid child, expected class context")
}

func HandleClass(class parser.ClassContext) (*Class, error) {
	if identifier, ok := IsString(class.GetChild(0)); ok {
		if class.GetChildCount() == 3 {
			return &Class{
				Identifier: *identifier,
				Vars:       make([]Var, 0),
			}, nil

		} else if class.GetChildCount() == 4 {
			if t, ok := class.GetChild(2).(*parser.VarsContext); ok {
				v, err := HandleVars(t)
				if err == nil {
					return &Class{
						Identifier: *identifier,
						Vars:       v,
					}, nil
				}
			} else {
				return nil, errors.New("invalid child, expected vars")
			}
		} else {
			return nil, errors.New("invalid context")
		}
	} else {
		return nil, errors.New("invalid child, expected terminal STRING node")
	}
	return nil, nil
}

func HandleVars(vars *parser.VarsContext) ([]Var, error) {
	result := make([]Var, 0)
	for _, tree := range vars.GetChildren() {
		if t, ok := tree.(*parser.VarxContext); ok {
			v, err := HandleVarx(*t)
			if err != nil {
				return nil, err
			}

			result = append(result, *v)
		} else if _, ok := tree.(*antlr.TerminalNodeImpl); !ok {
			return nil, errors.New("invalid token found, expected varx or terminal")
		}
	}
	return result, nil
}

func HandleVarx(varx parser.VarxContext) (*Var, error) {
    if varx.GetChildCount() == 2 {
        if identifier, ok := IsString(varx.GetChild(0)); ok {
            return &Var{
                Identifier: *identifier,
                Value: Value{
                    Nothing: true,
                },
            }, nil
        }
    }
	if varx.GetChildCount() != 3 {
		return nil, errors.New("invalid, expected 3 children")
	}
	if identifier, ok := IsString(varx.GetChild(0)); ok {
		if v, ok := varx.GetChild(2).(*parser.ValContext); ok {
			return HandleVal(*identifier, v)
		} else {
			return nil, errors.New("invalid, expected val")
		}
	}

	return nil, errors.New("invalid, expected STRING terminal")
}

func HandleVal(identifier string, v *parser.ValContext) (*Var, error) {
	switch x := v.GetChild(0).(type) {
	case *parser.UrlContext:
		slog.Info("Is url")
		u, err := HandleUrl(*x)
		if err == nil {
			return &Var{
				Identifier: identifier,
				Value: Value{
					Url: u,
				},
			}, nil
		}
		return nil, err
	case *parser.ClassContext:
		slog.Info("Is class")
		u, err := HandleClass(*x)
		if err == nil {
			return &Var{
				Identifier: identifier,
				Value: Value{
					Class: u,
				},
			}, nil
		}
		return nil, err
	case *parser.S_with_specialsContext:
		slog.Info("Is s")
		results := make([]parser.S_with_specialsContext, v.GetChildCount())
		for i, tree := range v.GetChildren() {
			if v, ok := tree.(*parser.S_with_specialsContext); ok {
				results[i] = *v
			} else {
				return nil, errors.New("invalid, need all s_with_specials")
			}
		}

		u, err := HandleSpecials(results)
		if err == nil {
			return &Var{
				Identifier: identifier,
				Value: Value{
					String: u,
				},
			}, nil
		}
		return nil, err
	case *antlr.TerminalNodeImpl:
		switch x.GetSymbol().GetTokenType() {
		case parser.LogParserLexerLCURLY:
			return &Var{
				Identifier: identifier,
				Value: Value{
					EmptyObject: true,
				},
			}, nil
		case parser.LogParserLexerLSQUARE:
			if v.GetChildCount() == 2 {
				return &Var{
					Identifier: identifier,
					Value: Value{
						EmptyArray: true,
					},
				}, nil
			}

			results := make([]Class, 0)
			for _, tree := range v.GetChildren() {
				if v, ok := tree.(*parser.ClassContext); ok {
					c, err := HandleClass(*v)
					if err != nil {
						return nil, err
					}
					results = append(results, *c)
				} else if v, ok := tree.(*antlr.TerminalNodeImpl); ok {
					if v.GetSymbol().GetTokenType() != parser.LogParserLexerCOMMA {
						return nil, errors.New("invalid, needed just commas and classes")
					}
				} else {
					return nil, errors.New("invalid, need all ClassContext")
				}
			}

			return &Var{
				Identifier: identifier,
				Value: Value{
					Classes: results,
				},
			}, nil
		case parser.LogParserLexerOPTIONAL:
			if t, ok := v.GetChild(2).(*parser.ValContext); ok {
				v, err := HandleVal("", t)
				if err != nil {
					return nil, err
				}

				return &Var{
					Identifier: identifier,
					Value:      v.Value,
				}, nil
			}

			return nil, errors.New("invalid, needed val")
		default:
			return nil, errors.New("invalid, unknown starting terminal")
		}
	default:
		return nil, errors.New("invalid, unknown starting token")
	}
}

func HandleUrl(u parser.UrlContext) (*URL, error) {
	return &URL{Content: u.GetText()}, nil
}

func HandleSpecials(s []parser.S_with_specialsContext) (*string, error) {
	output := ""
	for _, context := range s {
		output += context.GetText()
	}
	return &output, nil
}

func main() {
	c := make(chan struct{}, 0)
	js.Global().Set("logAntlr", js.FuncOf(LogAntlr))
	<-c
}

type URL struct {
	Content string
}

func (u URL) AsMap() map[string]interface{} {
	return map[string]interface{}{
		"Content": u.Content,
	}
}

type Class struct {
	Identifier string
	Vars       []Var
}

func (c Class) AsMap() map[string]interface{} {
	vs := make([]interface{}, len(c.Vars))
	for i, v := range c.Vars {
		vs[i] = v.AsMap()
	}

	return map[string]interface{}{
		"Identifier": c.Identifier,
		"Vars":       vs,
	}
}

type Var struct {
	Identifier string
	Value      Value
}

func (v Var) AsMap() map[string]interface{} {
	return map[string]interface{}{
		"Identifier": v.Identifier,
		"Value":      v.Value.AsMap(),
	}
}

type Value struct {
	Url         *URL
	Class       *Class
	String      *string
	EmptyObject bool
	EmptyArray  bool
	Classes     []Class
	Optional    *Value
	Nothing     bool
}

func (v Value) AsMap() map[string]interface{} {
	r := map[string]interface{}{
		"EmptyObject": v.EmptyObject,
		"EmptyArray":  v.EmptyArray,
		"Nothing": v.Nothing,
	}

	if v.Url != nil {
		r["Url"] = v.Url.AsMap()
	}
	if v.Class != nil {
		r["Class"] = v.Class.AsMap()
	}
	if v.String != nil {
		r["String"] = *v.String
	}
	if len(v.Classes) > 0 {
		a := make([]interface{}, len(v.Classes))
		for i, class := range v.Classes {
			a[i] = class.AsMap()
		}
		r["Classes"] = a
	}
	if v.Optional != nil {
		r["Optional"] = v.Optional.AsMap()
	}

	return r
}

func ErrN(v string) map[string]interface{} {
	return Err{Error: v}.AsMap()
}

func LogAntlr(this js.Value, inputs []js.Value) (i interface{}) {
	defer func() {
		if recover() != nil {
			i = ErrN("panicked")
			return
		}
	}()

	if len(inputs) != 1 {
		return ErrN("bad call, need one argument")
	}

	if inputs[0].Type() != js.TypeString {
		return ErrN("bad call, arg must be a string")
	}

	tree := RunAntlr(inputs[0].String())
	if logs, ok := tree.(*parser.LogsContext); ok {
		handleLogs, err := HandleLogs(*logs)
		if err != nil {
			return ErrN(err.Error())
		}

		return handleLogs.AsMap()
	} else {
		return ErrN("invalid, no logs")
	}
}

func RunAntlr(input string) parser.ILogsContext {
	// Setup the input
	is := antlr.NewInputStream(input)

	// Create the Lexer
	lexer := parser.NewLogParserLexer(is)
	stream := antlr.NewCommonTokenStream(lexer, antlr.TokenDefaultChannel)

	// Create the Parser
	p := parser.NewLogParserParser(stream)

	// Finally parse the expression
	return p.Logs()
}
