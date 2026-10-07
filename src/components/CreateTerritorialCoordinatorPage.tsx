import React from 'react';
import { SubordinateCreatePage } from './SubordinateCreatePage';
import type { TerritorialLeader } from '../types/territory';
import type { UserAccount } from '../types/auth';
import type { ElectoralSection } from '../types/sections';

interface CreateTerritorialCoordinatorPageProps {
  currentUser: UserAccount;
  availableSections: ElectoralSection[];
  onSaveCoordinator: (leader: TerritorialLeader, account: UserAccount) => Promise<void>;
  onBack: () => void;
}

export const CreateTerritorialCoordinatorPage: React.FC<CreateTerritorialCoordinatorPageProps> = (props) => {
  return <SubordinateCreatePage {...props} />;
};
