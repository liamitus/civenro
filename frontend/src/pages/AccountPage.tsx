// frontend/src/pages/AccountPage.tsx

import React, { useEffect, useState, useContext } from 'react';
import { useParams } from 'react-router-dom';
import {
  getUserProfile,
  updateEmail,
  updatePassword,
  updateUsername,
} from '../services/userService';
import { getUserComments } from '../services/commentService';
import { AuthContext } from '../context/AuthContext';
import {
  Container,
  Typography,
  Tabs,
  Tab,
  Box,
  Button,
  TextField,
} from '@mui/material';
import Comment from '../components/Comment';

interface UserProfile {
  id: number;
  username: string;
  createdAt: string;
}

const AccountPage: React.FC = () => {
  const { userId } = useParams<{ userId: string }>();
  const { user } = useContext(AuthContext);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [comments, setComments] = useState([]);
  const [activeTab, setActiveTab] = useState(0); // 0 for Comments, 1 for Settings

  // Settings form state
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [settingsMessage, setSettingsMessage] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      if (userId) {
        try {
          const profile = await getUserProfile(parseInt(userId));
          setUserProfile(profile);

          const userComments = await getUserComments(parseInt(userId));
          setComments(userComments);

          // If viewing own profile, set settings form fields
          if (user && user.id === parseInt(userId)) {
            setUsername(profile.username);
            setEmail(user.email); // Assuming email is stored in auth context
          }
        } catch (error) {
          console.error('Error fetching user data:', error);
        }
      }
    };
    fetchData();
  }, [userId, user]);

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
    setSettingsMessage('');
  };

  // Handlers for updating settings
  const handleUpdateUsername = async () => {
    try {
      const data = await updateUsername(username);
      setSettingsMessage('Username updated successfully');
      // Update auth context user data if necessary
      if (user) {
        user.username = data.user.username;
      }
    } catch (error) {
      console.error('Error updating username:', error);
      setSettingsMessage('Failed to update username');
    }
  };

  const handleUpdateEmail = async () => {
    try {
      const data = await updateEmail(email);
      setSettingsMessage('Email updated successfully');
      if (user) {
        user.email = data.user.email;
      }
    } catch (error) {
      console.error('Error updating email:', error);
      setSettingsMessage('Failed to update email');
    }
  };

  const handleUpdatePassword = async () => {
    try {
      await updatePassword(currentPassword, newPassword);
      setSettingsMessage('Password updated successfully');
      // Clear password fields
      setCurrentPassword('');
      setNewPassword('');
    } catch (error) {
      console.error('Error updating password:', error);
      setSettingsMessage('Failed to update password');
    }
  };

  return (
    <Container>
      {userProfile ? (
        <>
          <Typography variant="h4">{userProfile.username}'s Account</Typography>
          <Typography variant="body2" color="textSecondary">
            Joined on {new Date(userProfile.createdAt).toLocaleDateString()}
          </Typography>

          <Tabs value={activeTab} onChange={handleTabChange} sx={{ mt: 2 }}>
            <Tab label="Comments" />
            {user && user.id === parseInt(userId || '') && (
              <Tab label="Settings" />
            )}
          </Tabs>

          {activeTab === 0 && (
            <Box mt={2}>
              {comments.length > 0 ? (
                comments.map((comment: any) => (
                  <Comment
                    key={comment.id}
                    comment={comment}
                    billId={comment.billId}
                    refreshComments={() => {}}
                  />
                ))
              ) : (
                <Typography>No comments to display.</Typography>
              )}
            </Box>
          )}

          {activeTab === 1 && user && user.id === parseInt(userId || '') && (
            <Box mt={2}>
              <Typography variant="h6">Edit Settings</Typography>

              {/* Update Username */}
              <Box mt={2}>
                <Typography variant="subtitle1">Update Username</Typography>
                <TextField
                  label="New Username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  fullWidth
                />
                <Button
                  variant="contained"
                  onClick={handleUpdateUsername}
                  sx={{ mt: 1 }}
                >
                  Update Username
                </Button>
              </Box>

              {/* Update Email */}
              <Box mt={2}>
                <Typography variant="subtitle1">Update Email</Typography>
                <TextField
                  label="New Email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  fullWidth
                />
                <Button
                  variant="contained"
                  onClick={handleUpdateEmail}
                  sx={{ mt: 1 }}
                >
                  Update Email
                </Button>
              </Box>

              {/* Update Password */}
              <Box mt={2}>
                <Typography variant="subtitle1">Change Password</Typography>
                <TextField
                  label="Current Password"
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  fullWidth
                />
                <TextField
                  label="New Password"
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  fullWidth
                  sx={{ mt: 1 }}
                />
                <Button
                  variant="contained"
                  onClick={handleUpdatePassword}
                  sx={{ mt: 1 }}
                >
                  Update Password
                </Button>
              </Box>

              {settingsMessage && (
                <Typography variant="body2" color="success.main" sx={{ mt: 2 }}>
                  {settingsMessage}
                </Typography>
              )}
            </Box>
          )}
        </>
      ) : (
        <Typography>User not found.</Typography>
      )}
    </Container>
  );
};

export default AccountPage;
