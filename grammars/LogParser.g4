grammar LogParser;
//parser grammar LogParser;
//lexer grammar LogParser;

AND : 'and' ;
OR : 'or' ;
NOT : 'not' ;
EQ : '=' ;
COMMA : ',' ;
SEMI : ';' ;
LPAREN : '(' ;
RPAREN : ')' ;
LCURLY : '{' ;
RCURLY : '}' ;
LSQUARE : '[' ;
RSQUARE : ']' ;
FSLASH : '/' ;
BSLASH : '\\' ;
COLON : ':' ;
ANDS : '&' ;
QUESTION : '?' ;
HASH : '#' ;
AT : '@' ;

OPTIONAL : 'Optional' ;
STRING
    : ([a-zA-Z~0-9_<>] | HEX) ([<>_a-zA-Z0-9.+-] | HEX)*
    ;
INT : [0-9]+ ;
HEX
    : ('%' [a-fA-F0-9] [a-fA-F0-9])+
    ;
WS: [ \t\n\r\f]+ -> skip ;


// Defining a URL, borrowed from https://github.com/antlr/grammars-v4/blob/master/url/url.g4

url
    : url__uri
    ;

url__uri
    : url__scheme ':' '/' '/' url__login? url__host (':' url__port)? ('/' url__path?)? url__query? url__frag? WS?
    ;

url__scheme
    : url__string
    ;

url__host
    : '/'? url__hostname
    ;

url__hostname
    : url__string         # DomainNameOrIPv4Host
    | '[' url__v6host ']' # IPv6Host
    ;

url__v6host
    : ':' ':'? (url__string | INT) ((':' | ':' ':') (url__string | INT))*
    ;

url__port
    : INT
    ;

url__path
    : url__string ('/' url__string)* '/'?
    ;

url__user
    : url__string
    ;

url__login
    : url__user (':' url__password)? '@'
    ;

url__password
    : url__string
    ;

url__frag
    : '#' (url__string | INT)
    ;

url__query
    : '?' url__search
    ;

url__search
    : url__searchparameter ('&' url__searchparameter)*
    ;

url__searchparameter
    : url__string ('=' (url__string | INT | HEX))?
    ;

url__string
    : STRING
    | INT
    ;

// End URL

s__specials
    : '/'
    | ','
    | '['
    | ']'
    | ':'
    ;

s_with_specials
    : s__specials STRING
    | STRING s__specials
    | STRING s__specials STRING
    | STRING
    ;


logs : class EOF ;

class
    : STRING '{' vars '}'
    | STRING '{' '}'
    ;

vars
    : varx (',' varx)*
    ;

varx
    : STRING '=' val
    ;


val
    : url
    | class
    | s_with_specials+
    | '{' '}'
    | '[' ']'
    | '[' class (',' class)* ']'
    | 'Optional' '[' val ']'
    ;

//func : ID '(' expr (',' expr)* ')' ;
