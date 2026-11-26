package br.com.ascend.mobile;

import android.content.MutableContextWrapper;
import android.util.Log;
import androidx.annotation.NonNull;
import androidx.core.content.ContextCompat;
import androidx.credentials.Credential;
import androidx.credentials.CredentialManager;
import androidx.credentials.CredentialManagerCallback;
import androidx.credentials.CustomCredential;
import androidx.credentials.GetCredentialRequest;
import androidx.credentials.GetCredentialResponse;
import androidx.credentials.exceptions.GetCredentialException;
import androidx.credentials.exceptions.GetCredentialCancellationException;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.google.android.libraries.identity.googleid.GetSignInWithGoogleOption;
import com.google.android.libraries.identity.googleid.GoogleIdTokenCredential;

@CapacitorPlugin(name = "AscendGoogleSignIn")
public class GoogleSignInPlugin extends Plugin {
    private static final String TAG = "AscendGoogleSignIn";

    @PluginMethod
    public void signIn(PluginCall call) {
        String clientId = call.getString("clientId", "").trim();
        if (!clientId.endsWith(".apps.googleusercontent.com")) {
            call.reject("O login Google ainda não está configurado.", "NOT_CONFIGURED");
            return;
        }
        GetSignInWithGoogleOption option = new GetSignInWithGoogleOption.Builder(clientId).build();
        GetCredentialRequest request = new GetCredentialRequest.Builder().addCredentialOption(option).build();
        CredentialManager.create(getContext()).getCredentialAsync(
            new MutableContextWrapper(getActivity()), request, null,
            ContextCompat.getMainExecutor(getContext()),
            new CredentialManagerCallback<GetCredentialResponse, GetCredentialException>() {
                @Override
                public void onResult(GetCredentialResponse response) {
                    Credential credential = response.getCredential();
                    if (!(credential instanceof CustomCredential) ||
                            !GoogleIdTokenCredential.TYPE_GOOGLE_ID_TOKEN_CREDENTIAL.equals(credential.getType())) {
                        call.reject("Não foi possível obter a credencial do Google.");
                        return;
                    }
                    try {
                        GoogleIdTokenCredential google = GoogleIdTokenCredential.createFrom(credential.getData());
                        JSObject result = new JSObject();
                        result.put("credential", google.getIdToken());
                        call.resolve(result);
                    } catch (Exception error) {
                        call.reject("Não foi possível ler a credencial do Google.");
                    }
                }

                @Override
                public void onError(@NonNull GetCredentialException error) {
                    // Do not log the ID token or account details. The exception type
                    // is enough to diagnose Credential Manager configuration issues.
                    Log.w(TAG, "Credential Manager sign-in error: " + error.getType());
                    if (error instanceof GetCredentialCancellationException) {
                        call.reject(
                            "O Google não concluiu a autorização. Se você não cancelou, confira o cliente OAuth Android do pacote br.com.ascend.mobile e o SHA-1 usado para assinar este APK.",
                            "GOOGLE_AUTH_NOT_GRANTED"
                        );
                    } else {
                        call.reject(
                            "Não foi possível iniciar o login Google. Confira a conexão, o cliente OAuth Android e o SHA-1 da assinatura do APK.",
                            "GOOGLE_SIGN_IN_FAILED"
                        );
                    }
                }
            });
    }
}
