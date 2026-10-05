import traceback
from sympy import (
    sympify, solve, Eq, diff, integrate, limit, expand, factor, simplify,
    Symbol, Matrix, Basic, Function, latex, parse_expr, S, evaluate
)
from sympy.parsing.sympy_parser import parse_expr, standard_transformations, implicit_multiplication_application
import json

def parse_equation(eq_str):
    """
    Parses strings like '2*x + 5 = 17' into SymPy expressions or equations.
    """
    # Safe transformations for parsing strings
    transformations = (standard_transformations + (implicit_multiplication_application,))
    
    if "=" in eq_str:
        left, right = eq_str.split("=", 1)
        # Parse left and right side
        lhs = parse_expr(left, transformations=transformations)
        rhs = parse_expr(right, transformations=transformations)
        return Eq(lhs, rhs)
    else:
        return parse_expr(eq_str, transformations=transformations)

def solve_math(problem_type, expression, variables=None, options=None):
    """
    Core mathematical engine.
    problem_type: solve_equation, derivative, integral, simplify, factor, expand
    expression: string representation
    variables: comma separated string of variables to solve for/with respect to
    """
    result = {
        "success": False,
        "result": None,
        "steps": [],
        "latex_result": None,
        "error": None
    }
    
    try:
        if variables:
            var_list = [Symbol(v.strip()) for v in variables.split(",")]
            main_var = var_list[0]
        else:
            main_var = Symbol('x')
            var_list = [main_var]

        expr = parse_equation(expression)
        
        result["steps"].append(f"Interpreted expression: {expr}")
        
        if problem_type == "solve_equation":
            # If not an explicit Eq, solve for 0
            res = solve(expr, var_list, dict=True)
            if not res:
                res = solve(expr, var_list)
            result["result"] = str(res)
            result["latex_result"] = latex(res)
            result["steps"].append(f"Solving for {var_list}")
            
        elif problem_type == "derivative":
            res = diff(expr, main_var)
            result["result"] = str(res)
            result["latex_result"] = latex(res)
            result["steps"].append(f"Differentiating with respect to {main_var}")
            
        elif problem_type == "integral":
            res = integrate(expr, main_var)
            result["result"] = str(res)
            result["latex_result"] = latex(res)
            result["steps"].append(f"Integrating with respect to {main_var}")
            
        elif problem_type == "simplify":
            res = simplify(expr)
            result["result"] = str(res)
            result["latex_result"] = latex(res)
            result["steps"].append("Simplifying expression")
            
        elif problem_type == "factor":
            res = factor(expr)
            result["result"] = str(res)
            result["latex_result"] = latex(res)
            result["steps"].append("Factoring expression")
            
        elif problem_type == "expand":
            res = expand(expr)
            result["result"] = str(res)
            result["latex_result"] = latex(res)
            result["steps"].append("Expanding expression")
            
        else:
            raise ValueError(f"Unknown problem type: {problem_type}")
            
        result["success"] = True
        
    except Exception as e:
        result["error"] = str(e)
        result["traceback"] = traceback.format_exc()
        
    return result

def verify_math(original_expression, proposed_answer, variables=None):
    """
    Substitutes proposed_answer into original_expression to verify if it's correct.
    """
    result = {
        "verified": False,
        "is_correct": False,
        "details": "",
        "error": None
    }
    
    try:
        expr = parse_equation(original_expression)
        
        if variables:
            var_list = [Symbol(v.strip()) for v in variables.split(",")]
            main_var = var_list[0]
        else:
            main_var = Symbol('x')
            var_list = [main_var]

        # For simple equations, just check if left side == right side when substituting
        if isinstance(expr, Eq):
            ans = parse_equation(proposed_answer)
            # Try to substitute
            subbed = expr.subs(main_var, ans)
            is_true = simplify(subbed.lhs - subbed.rhs) == 0
            result["verified"] = True
            result["is_correct"] = is_true
            result["details"] = f"Substituted {main_var}={ans} into {expr}. Result: {is_true}"
        else:
            result["error"] = "Verification only implemented for equations currently."
            
    except Exception as e:
        result["error"] = str(e)
        
    return result

if __name__ == "__main__":
    print(solve_math("solve_equation", "2*x + 5 = 17"))
    print(verify_math("2*x + 5 = 17", "6"))
