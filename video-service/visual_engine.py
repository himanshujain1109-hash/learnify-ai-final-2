import matplotlib
matplotlib.use('Agg') # Headless backend
import matplotlib.pyplot as plt
import io
import networkx as nx
import numpy as np

def _fig_to_svg(fig):
    buf = io.StringIO()
    fig.savefig(buf, format='svg', bbox_inches='tight')
    plt.close(fig)
    return buf.getvalue()

def render_plot(equation, x_range=(-10, 10), y_range=None):
    """
    Renders a standard math function plot.
    """
    from sympy.parsing.sympy_parser import parse_expr, standard_transformations, implicit_multiplication_application
    from sympy import lambdify, Symbol
    
    x_sym = Symbol('x')
    transformations = (standard_transformations + (implicit_multiplication_application,))
    
    # Extract rhs if it's an equation 'y = x**2'
    if "=" in equation:
        equation = equation.split("=")[1].strip()
        
    expr = parse_expr(equation, transformations=transformations)
    f = lambdify(x_sym, expr, "numpy")
    
    x = np.linspace(x_range[0], x_range[1], 400)
    y = f(x)
    
    fig, ax = plt.subplots(figsize=(6, 4))
    ax.plot(x, y, label=f"y = {equation}")
    
    if y_range:
        ax.set_ylim(y_range)
        
    ax.axhline(0, color='black', linewidth=0.5)
    ax.axvline(0, color='black', linewidth=0.5)
    ax.grid(color='gray', linestyle='--', linewidth=0.5, alpha=0.5)
    ax.legend()
    
    return _fig_to_svg(fig)

def render_flowchart(nodes_list, edges_list):
    """
    Renders a flowchart using NetworkX.
    nodes_list: [{"id": "1", "label": "Start"}, ...]
    edges_list: [["1", "2"], ...]
    """
    G = nx.DiGraph()
    
    labels = {}
    for n in nodes_list:
        G.add_node(n["id"])
        labels[n["id"]] = n.get("label", n["id"])
        
    for e in edges_list:
        G.add_edge(e[0], e[1])
        
    fig, ax = plt.subplots(figsize=(8, 6))
    
    # Try using hierarchical layout if pygraphviz/pydot is installed, else use spring
    try:
        pos = nx.nx_agraph.graphviz_layout(G, prog='dot')
    except ImportError:
        pos = nx.spring_layout(G)
        
    nx.draw(
        G, pos, ax=ax, with_labels=True, labels=labels,
        node_size=2000, node_color='lightblue', font_size=10, 
        font_weight='bold', arrows=True, arrowsize=20
    )
    
    return _fig_to_svg(fig)

def generate_visual(spec):
    """
    Main dispatcher.
    spec: dict containing type and data
    """
    try:
        v_type = spec.get("type")
        
        if v_type == "function_plot":
            return {
                "success": True, 
                "svg": render_plot(
                    spec.get("equation", "x"), 
                    spec.get("x_range", (-10, 10)), 
                    spec.get("y_range")
                )
            }
        elif v_type == "flowchart":
            return {
                "success": True,
                "svg": render_flowchart(
                    spec.get("nodes", []),
                    spec.get("edges", [])
                )
            }
        else:
            return {"success": False, "error": f"Unsupported visual type: {v_type}"}
            
    except Exception as e:
        return {"success": False, "error": str(e)}

if __name__ == "__main__":
    print(generate_visual({"type": "function_plot", "equation": "x**2"})["svg"][:100])
