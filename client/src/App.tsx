import beaver from "./assets/beaver.svg";
import { hcWithType } from "server/dist/client";
import { useMutation } from "@tanstack/react-query";
import "./App.css";

const SERVER_URL = import.meta.env.VITE_SERVER_URL || "http://localhost:3000";

const client = hcWithType(SERVER_URL);

type HelloResponse = {
    success: boolean;
    data?: {
        message: string;
    };
};

function App() {
    const apiRequestMutation = useMutation({
        mutationFn: async (): Promise<HelloResponse> => {
            const res = await client.hello.$get();
            if (!res.ok) {
                throw new Error("Error fetching data");
            }
            const data = (await res.json()) as HelloResponse;
            return data;
        },
        onError: (err: unknown) => console.log(err),
    });

    const responseData = apiRequestMutation.data?.data;

    return (
        <>
            <div>
                <a
                    href="https://github.com/fetch/fetch"
                    target="_blank"
                    rel="noopener"
                >
                    <img src={beaver} className="logo" alt="fetch logo" />
                </a>
            </div>
            <h1>Fetch</h1>
            <h2>Shopping List PWA</h2>
            <p>A self-hosted shopping list with real-time sync</p>
            <div className="card">
                <div className="button-container">
                    <button type="button" onClick={() => apiRequestMutation.mutate()}>
                        Call API
                    </button>
                    <a
                        className="docs-link"
                        target="_blank"
                        href="https://github.com/fetch/fetch"
                        rel="noopener"
                    >
                        Docs
                    </a>
                </div>
                {apiRequestMutation.isSuccess && responseData && (
                    <pre className="response">
                        <code>
                            Message: {responseData.message} <br />
                            Success: {apiRequestMutation.data.success.toString()}
                        </code>
                    </pre>
                )}
            </div>
        </>
    );
}

export default App;
