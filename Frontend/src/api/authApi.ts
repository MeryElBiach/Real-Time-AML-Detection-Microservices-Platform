const API_BASE_URL = "http://localhost:8080/api";

interface LoginResponse {
    token: string;
}

export async function login(
    email: string,
    password: string
): Promise<LoginResponse> {
    const response = await fetch(`${API_BASE_URL}/auth/login`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify({
            email,
            password,
        }),
    });

    if (!response.ok) {
        throw new Error("Identifiants invalides");
    }

    return response.json();
}