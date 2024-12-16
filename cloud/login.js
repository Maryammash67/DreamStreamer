const poolData = {
    UserPoolId: 'us-east-1_WFq6IC8Ew', // Replace with your Cognito User Pool ID
    ClientId: '2utqhua3mqhle8e82tk8t340fr' // Replace with your Cognito App Client ID
};

const userPool = new AmazonCognitoIdentity.CognitoUserPool(poolData);

document.addEventListener("DOMContentLoaded", () => {
    // Check if there is a hash in the URL (e.g., after redirect from Cognito)
    const hash = window.location.hash;
    if (hash) {
        const result = parseCognitoResponse(hash);
        if (result.access_token) {
            document.getElementById('message').innerText = 'Login successful via callback!';
            console.log('Access Token:', result.access_token);
        } else {
            document.getElementById('message').innerText = 'Login callback failed or incomplete!';
            console.error('Callback data:', result);
        }
        // Optionally, clear the URL fragment after processing
        window.location.hash = '';
    }
});

function parseCognitoResponse(hash) {
    const queryParams = new URLSearchParams(hash.slice(1));
    return {
        access_token: queryParams.get('access_token'),
        id_token: queryParams.get('id_token'),
        refresh_token: queryParams.get('refresh_token'),
        token_type: queryParams.get('token_type'),
        expires_in: queryParams.get('expires_in')
    };
}

function login(event) {
    event.preventDefault(); // Prevent the form from submitting traditionally

    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;

    const authenticationData = {
        Username: username,
        Password: password,
    };
    const authenticationDetails = new AmazonCognitoIdentity.AuthenticationDetails(authenticationData);

    const userData = {
        Username: username,
        Pool: userPool
    };
    const cognitoUser = new AmazonCognitoIdentity.CognitoUser(userData);

    cognitoUser.authenticateUser(authenticationDetails, {
        onSuccess: function (result) {
            const accessToken = result.getAccessToken().getJwtToken();
            document.getElementById('message').innerText = 'Login successful!';
            console.log('Login successful:', accessToken);

            // Retrieve user attributes
            cognitoUser.getUserAttributes(function(err, attributes) {
                if (err) {
                    console.error('Failed to retrieve attributes:', err);
                    document.getElementById('message').innerText = `Error retrieving attributes: ${err.message || JSON.stringify(err)}`;
                    return;
                }

                // Create a message with user attributes
                let attributeMessage = 'User Attributes:<br>';
                attributes.forEach(attribute => {
                    const name = attribute.getName();
                    const value = attribute.getValue();
                    if (name === 'custom:UserType' || 
                        name === 'sub' || 
                        name === 'profile' || 
                        name === 'preferred_username' || 
                        name === 'nickname' || 
                        name === 'gender' || 
                        name === 'email') {
                        attributeMessage += `${name}: ${value}<br>`;
                    }
                });

                // Display the user attributes
                document.getElementById('message').innerHTML = attributeMessage;
            });
        },

        onFailure: function (err) {
            document.getElementById('message').innerText = `Error: ${err.message || JSON.stringify(err)}`;
            console.error('Login failed:', err);
        },

        newPasswordRequired: function (userAttributes, requiredAttributes) {
            // User was authenticated but needs to set a new password
            document.getElementById('message').innerText = 'New password required. Please enter a new password.';

            // Remove unneeded attributes, they are not required for the password change
            delete userAttributes.email_verified;
            delete userAttributes.phone_number_verified;
            delete userAttributes.phone_number; // Remove phone_number to prevent NotAuthorizedException
            delete userAttributes.email;

            // Prompt user to enter a new password
            const newPassword = prompt("Please enter your new password:");

            cognitoUser.completeNewPasswordChallenge(newPassword, userAttributes, {
                onSuccess: function (result) {
                    document.getElementById('message').innerText = 'Password updated successfully!';
                    console.log('Password updated successfully:', result);

                    // Now authenticate the user again with the new password
                    cognitoUser.authenticateUser(authenticationDetails, {
                        onSuccess: function (result) {
                            const accessToken = result.getAccessToken().getJwtToken();
                            document.getElementById('message').innerText = 'Login successful after password change!';
                            console.log('Login successful after password change:', accessToken);

                            // Retrieve and display user attributes
                            cognitoUser.getUserAttributes(function(err, attributes) {
                                if (err) {
                                    console.error('Failed to retrieve attributes:', err);
                                    document.getElementById('message').innerText = `Error retrieving attributes: ${err.message || JSON.stringify(err)}`;
                                    return;
                                }

                                let attributeMessage = 'User Attributes:<br>';
                                attributes.forEach(attribute => {
                                    const name = attribute.getName();
                                    const value = attribute.getValue();
                                    if (name === 'custom:UserType' || 
                                        name === 'sub' || 
                                        name === 'profile' || 
                                        name === 'preferred_username' || 
                                        name === 'nickname' || 
                                        name === 'gender' || 
                                        name === 'email') {
                                        attributeMessage += `${name}: ${value}<br>`;
                                    }
                                });

                                document.getElementById('message').innerHTML = attributeMessage;
                            });
                        },

                        onFailure: function (err) {
                            document.getElementById('message').innerText = `Error after password change: ${err.message || JSON.stringify(err)}`;
                            console.error('Login failed after password change:', err);
                        }
                    });
                },

                onFailure: function (err) {
                    document.getElementById('message').innerText = `Failed to update password: ${err.message || JSON.stringify(err)}`;
                    console.error('Failed to update password:', err);
                }
            });
        }
    });
}



function signOut() {
    const cognitoUser = userPool.getCurrentUser();

    if (cognitoUser) {
        cognitoUser.signOut();
        document.getElementById('message').innerText = 'User signed out!';
        console.log('User signed out');
        // Optionally, redirect to the login page
        // window.location.href = "login.html";
    }
}
