from flask import Flask, render_template

app = Flask(
    __name__, 
    template_folder='pages', 
    static_folder='.', 
    static_url_path=''
)

@app.route('/')
def index():
    return render_template('index.html')

if __name__ == '__main__':
    # Agora rodando explicitamente na porta 8080
    app.run(debug=True, port=8000)