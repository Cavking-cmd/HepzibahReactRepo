function base64UrlToBuffer(base64url: string): ArrayBuffer {
  const padded = base64url.replace(/-/g, "+").replace(/_/g, "/").padEnd(base64url.length + ((4 - (base64url.length % 4)) % 4), "=");
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes.buffer;
}

function bufferToBase64Url(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export function isWebAuthnSupported(): boolean {
  return typeof window !== "undefined" && !!window.PublicKeyCredential;
}

export interface CredentialCreateOptionsDto {
  rp: { id: string; name: string };
  user: { id: string; name: string; displayName: string };
  challenge: string;
  pubKeyCredParams: { type: string; alg: number }[];
  timeout?: number;
  excludeCredentials?: { id: string; type: string }[];
  authenticatorSelection?: {
    residentKey?: string;
    requireResidentKey?: boolean;
    userVerification?: string;
  };
  attestation?: string;
}

export async function createPasskeyCredential(optionsDto: CredentialCreateOptionsDto) {
  const publicKey: PublicKeyCredentialCreationOptions = {
    rp: optionsDto.rp,
    user: {
      id: base64UrlToBuffer(optionsDto.user.id),
      name: optionsDto.user.name,
      displayName: optionsDto.user.displayName,
    },
    challenge: base64UrlToBuffer(optionsDto.challenge),
    pubKeyCredParams: optionsDto.pubKeyCredParams.map((p) => ({ type: "public-key", alg: p.alg })),
    timeout: optionsDto.timeout,
    excludeCredentials: optionsDto.excludeCredentials?.map((c) => ({
      id: base64UrlToBuffer(c.id),
      type: "public-key",
    })),
    authenticatorSelection: optionsDto.authenticatorSelection as AuthenticatorSelectionCriteria | undefined,
    attestation: optionsDto.attestation as AttestationConveyancePreference | undefined,
  };

  const credential = (await navigator.credentials.create({ publicKey })) as PublicKeyCredential | null;
  if (!credential) throw new Error("Passkey creation was cancelled or failed.");

  const response = credential.response as AuthenticatorAttestationResponse;

  return {
    attestationResponse: {
      id: credential.id,
      rawId: bufferToBase64Url(credential.rawId),
      type: credential.type,
      response: {
        attestationObject: bufferToBase64Url(response.attestationObject),
        clientDataJson: bufferToBase64Url(response.clientDataJSON),
      },
      extensions: {},
    },
  };
}

export interface AssertionOptionsDto {
  challenge: string;
  timeout?: number;
  rpId?: string;
  allowCredentials?: { id: string; type: string }[];
  userVerification?: string;
}

export async function getPasskeyAssertion(optionsDto: AssertionOptionsDto) {
  const publicKey: PublicKeyCredentialRequestOptions = {
    challenge: base64UrlToBuffer(optionsDto.challenge),
    timeout: optionsDto.timeout,
    rpId: optionsDto.rpId,
    allowCredentials: optionsDto.allowCredentials?.map((c) => ({
      id: base64UrlToBuffer(c.id),
      type: "public-key",
    })),
    userVerification: optionsDto.userVerification as UserVerificationRequirement | undefined,
  };

  const credential = (await navigator.credentials.get({ publicKey })) as PublicKeyCredential | null;
  if (!credential) throw new Error("Passkey sign-in was cancelled or failed.");

  const response = credential.response as AuthenticatorAssertionResponse;

  return {
    assertionResponse: {
      id: credential.id,
      rawId: bufferToBase64Url(credential.rawId),
      type: credential.type,
      response: {
        authenticatorData: bufferToBase64Url(response.authenticatorData),
        clientDataJson: bufferToBase64Url(response.clientDataJSON),
        signature: bufferToBase64Url(response.signature),
        userHandle: response.userHandle ? bufferToBase64Url(response.userHandle) : null,
      },
      extensions: {},
    },
  };
}
