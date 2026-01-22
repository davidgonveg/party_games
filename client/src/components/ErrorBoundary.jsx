import React from 'react';

class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null, errorInfo: null };
    }

    static getDerivedStateFromError(error) {
        return { hasError: true };
    }

    componentDidCatch(error, errorInfo) {
        this.setState({ error, errorInfo });
        console.error("Uncaught error:", error, errorInfo);
    }

    render() {
        if (this.state.hasError) {
            return (
                <div className="min-h-screen bg-gray-900 text-white p-8 flex flex-col items-center justify-center">
                    <h1 className="text-3xl font-bold text-red-500 mb-4">¡Ups! Algo salió mal 💥</h1>
                    <div className="bg-gray-800 p-6 rounded-xl border border-red-500/50 max-w-2xl w-full text-left overflow-auto max-h-[80vh]">
                        <p className="font-bold text-lg mb-2">Error:</p>
                        <pre className="text-red-300 whitespace-pre-wrap font-mono text-sm mb-4">
                            {this.state.error && this.state.error.toString()}
                        </pre>
                        <p className="font-bold text-lg mb-2">Component Stack:</p>
                        <pre className="text-gray-400 whitespace-pre-wrap font-mono text-xs">
                            {this.state.errorInfo && this.state.errorInfo.componentStack}
                        </pre>
                    </div>
                    <button
                        onClick={() => window.location.href = '/'}
                        className="mt-8 bg-blue-600 hover:bg-blue-700 px-6 py-3 rounded-lg font-bold"
                    >
                        Volver al Inicio
                    </button>
                </div>
            );
        }

        return this.props.children;
    }
}

export default ErrorBoundary;
