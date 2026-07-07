import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import api from "../../shared/api/api";
import styles from "../pay/PayPage.module.css";
import back from "../../images/arrow-left.png";
import searchIcon from "../../images/search.png";
import userimg from "../../images/user.png";
import { getDisplayName } from "../../shared/utils/displayName";


const AddMember = () => {
    const navigate = useNavigate();
    const { type } = useParams();
    const [allUsers, setAllUsers] = useState([]);
    const [searchQuery, setSearchQuery] = useState("");

    useEffect(() => {
        const fetchUsers = async () => {
            try {
                // Prefer endpoint with full user list for team selection.
                const response = await api.get("/user/all-users-for-guild");
                const users = Array.isArray(response.data) ? response.data : [];
                setAllUsers(users);
            } catch (error) {
                try {
                    // Fallback for older backend versions.
                    const fallback = await api.get("/user/all-users");
                    const users = Array.isArray(fallback.data) ? fallback.data : [];
                    setAllUsers(users);
                } catch (fallbackError) {
                    console.error("err:", fallbackError);
                }
            }
        };
        fetchUsers();
    }, []);

    const filteredUsers = allUsers.filter((user) =>
        getDisplayName(user, '').toLowerCase().includes(searchQuery.toLowerCase())
    );

    const handleConfirm = (user) => {
        navigate("/team", {
            state: {
                selectedMember: {
                    id: user.id,
                    name: getDisplayName(user, 'Unknown'),
                    imageUrl: user.avatarUrl || null,
                    type: type
                }
            }
        });
    };

    return (
        <div className={styles.container}>
            <div className={styles.header_cont}>
                <img src={back} alt="back" onClick={() => navigate("/team")} style={{ cursor: "pointer" }} />
                <div className="name"><h1>Select user</h1></div>
                <div></div>
            </div>
            <div className={styles.nav}>
                <div className={styles.searchWrapper}>
                    <img src={searchIcon} alt="search" className={styles.searchIcon} />
                    <input
                        type="text"
                        placeholder="Enter username"
                        className={styles.input}
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                    />
                </div>
            </div>
            <div className={styles.cardcont}>
                <p style={{ color: "rgb(173, 173, 173)" }}>All users</p>
                {filteredUsers.length > 0 ? (
                    filteredUsers.map(user => (
                        <div
                            key={user.id}
                            className={styles.card}
                            onClick={() => handleConfirm(user)}
                        >
                            <div className={styles.rankBadge}>
                                <img
                                    src={user.avatarUrl || userimg}
                                    alt={`${getDisplayName(user, 'User')} avatar`}
                                    className={styles.rankImg}
                                    onError={(event) => {
                                        event.currentTarget.onerror = null;
                                        event.currentTarget.src = userimg;
                                    }}
                                    style={{ color: "white", fontSize: "small", objectFit: "cover" }}
                                />
                            </div>
                            <div className={styles.cardInfo}>
                                <p className={styles.userName}>{getDisplayName(user, 'Unknown')}</p>
                            </div>
                        </div>
                    ))
                ) : (
                    <p style={{ color: "white", margin: "auto", textAlign: "center" }}>
                        {searchQuery ? "No users found" : "No users"}
                    </p>
                )}
            </div>
        </div>
    );
}
export default AddMember;
